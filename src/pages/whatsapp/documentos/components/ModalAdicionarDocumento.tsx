import {
  useEffect,
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
  buscarClienteDocumentoPorContato,
  enviarDocumento,
} from '../services/documentosService'

import {
  DOCUMENTO_GRUPOS,
  listarCategoriasParaCliente,
  type DocumentoCategoria,
  type DocumentoClienteVinculado,
  type DocumentoGrupo,
} from '../types/documentos'

interface ModalAdicionarDocumentoProps {
  conversationId: string
  contatoId: string
  onClose: () => void
  onSuccess: () => void
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
  valor: string | null,
  tipo: 'PF' | 'PJ'
): string {
  if (!valor) {
    return ''
  }

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

export function ModalAdicionarDocumento({
  conversationId,
  contatoId,
  onClose,
  onSuccess,
}: ModalAdicionarDocumentoProps) {
  const inputArquivoRef =
    useRef<HTMLInputElement | null>(
      null
    )

  const [
    cliente,
    setCliente,
  ] =
    useState<DocumentoClienteVinculado | null>(
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
    carregandoCliente,
    setCarregandoCliente,
  ] =
    useState(true)

  const [
    enviando,
    setEnviando,
  ] =
    useState(false)

  const [
    erroCliente,
    setErroCliente,
  ] =
    useState<string | null>(
      null
    )

  useEffect(() => {
    let ativo = true

    async function carregarCliente() {
      try {
        setCarregandoCliente(true)
        setErroCliente(null)

        const resultado =
          await buscarClienteDocumentoPorContato(
            contatoId
          )

        if (!ativo) {
          return
        }

        if (!resultado) {
          setCliente(null)

          setErroCliente(
            'Este contato do WhatsApp ainda não está vinculado a um cliente do CRM.'
          )

          return
        }

        setCliente(resultado)
      } catch (error) {
        console.error(
          'Erro ao identificar cliente do documento:',
          error
        )

        if (!ativo) {
          return
        }

        setCliente(null)

        setErroCliente(
          error instanceof Error
            ? error.message
            : 'Não foi possível identificar o cliente vinculado.'
        )
      } finally {
        if (ativo) {
          setCarregandoCliente(
            false
          )
        }
      }
    }

    if (!contatoId?.trim()) {
      setCliente(null)

      setErroCliente(
        'Contato do WhatsApp não informado.'
      )

      setCarregandoCliente(false)

      return () => {
        ativo = false
      }
    }

    void carregarCliente()

    return () => {
      ativo = false
    }
  }, [contatoId])

  const categoriasPermitidas =
    useMemo(() => {
      if (!cliente) {
        return []
      }

      return listarCategoriasParaCliente(
        cliente.tipo
      )
    }, [cliente])

  const gruposDisponiveis =
    useMemo(() => {
      if (!cliente) {
        return []
      }

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
      cliente,
      categoriasPermitidas,
    ])

  const handleSelecionarArquivo =
    (
      event: ChangeEvent<HTMLInputElement>
    ) => {
      const selecionado =
        event.target.files?.[0] ??
        null

      if (!selecionado) {
        return
      }

      if (selecionado.size <= 0) {
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

      if (!cliente) {
        toast.error(
          'Cliente vinculado não identificado.'
        )
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

      try {
        setEnviando(true)

        await enviarDocumento({
          conversationId,
          categoria,
          arquivo,
          cliente,
        })

        toast.success(
          'Documento adicionado com sucesso.'
        )

        onSuccess()
        onClose()
      } catch (error) {
        console.error(
          'Erro ao adicionar documento:',
          error
        )

        toast.error(
          error instanceof Error
            ? error.message
            : 'Não foi possível adicionar o documento.'
        )
      } finally {
        setEnviando(false)
      }
    }

  const podeEnviar =
    Boolean(
      cliente &&
        categoria &&
        arquivo &&
        !carregandoCliente &&
        !enviando
    )

  return (
    <div
      className={[
        'fixed',
        'inset-0',
        'z-[100]',
        'flex',
        'items-center',
        'justify-center',
        'bg-black/40',
        'p-4',
        'backdrop-blur-[1px]',
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
          'max-w-[560px]',
          'flex-col',
          'overflow-hidden',
          'rounded-2xl',
          'border',
          'border-gray-200',
          'bg-white',
          'shadow-2xl',
          'dark:border-slate-700',
          'dark:bg-slate-950',
        ].join(' ')}
      >
        <div
          className={[
            'flex',
            'items-start',
            'justify-between',
            'border-b',
            'border-gray-100',
            'px-5',
            'py-4',
            'dark:border-slate-800',
          ].join(' ')}
        >
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
                'mt-1',
                'text-xs',
                'text-gray-400',
                'dark:text-slate-500',
              ].join(' ')}
            >
              O arquivo será armazenado
              na Central de Armazenamento.
            </p>
          </div>

          <button
            type="button"
            title="Fechar"
            disabled={enviando}
            onClick={onClose}
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
              'hover:bg-gray-100',
              'hover:text-gray-600',
              'disabled:cursor-not-allowed',
              'disabled:opacity-40',
              'dark:hover:bg-slate-800',
              'dark:hover:text-slate-200',
            ].join(' ')}
          >
            <X size={17} />
          </button>
        </div>

        <div
          className={[
            'flex-1',
            'space-y-5',
            'overflow-y-auto',
            'p-5',
          ].join(' ')}
        >
          <section>
            <label
              className={[
                'mb-2',
                'block',
                'text-xs',
                'font-semibold',
                'uppercase',
                'tracking-wide',
                'text-gray-400',
                'dark:text-slate-500',
              ].join(' ')}
            >
              Cliente vinculado
            </label>

            {carregandoCliente ? (
              <div
                className={[
                  'flex',
                  'min-h-[78px]',
                  'items-center',
                  'justify-center',
                  'rounded-xl',
                  'border',
                  'border-gray-200',
                  'bg-gray-50',
                  'dark:border-slate-700',
                  'dark:bg-slate-900',
                ].join(' ')}
              >
                <div
                  className={[
                    'flex',
                    'items-center',
                    'gap-2',
                    'text-sm',
                    'text-gray-400',
                  ].join(' ')}
                >
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />

                  Identificando cliente...
                </div>
              </div>
            ) : erroCliente ? (
              <div
                className={[
                  'rounded-xl',
                  'border',
                  'border-amber-200',
                  'bg-amber-50',
                  'px-4',
                  'py-3',
                  'text-sm',
                  'text-amber-800',
                  'dark:border-amber-900/60',
                  'dark:bg-amber-950/30',
                  'dark:text-amber-300',
                ].join(' ')}
              >
                {erroCliente}
              </div>
            ) : cliente ? (
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
                  'dark:border-slate-700',
                  'dark:bg-slate-900',
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
                    'rounded-full',
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

                <div className="min-w-0 flex-1">
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
            ) : null}
          </section>

          {cliente && (
            <section>
              <label
                htmlFor="categoria-documento"
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
                id="categoria-documento"
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
          )}

          {cliente && (
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
                    inputArquivoRef.current?.click()
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
                    'border-gray-300',
                    'bg-gray-50/50',
                    'px-5',
                    'py-5',
                    'text-center',
                    'transition',
                    'hover:border-blue-300',
                    'hover:bg-blue-50/50',
                    'disabled:cursor-not-allowed',
                    'disabled:opacity-60',
                    'dark:border-slate-700',
                    'dark:bg-slate-900/50',
                    'dark:hover:border-blue-800',
                    'dark:hover:bg-blue-950/20',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'mb-3',
                      'flex',
                      'h-10',
                      'w-10',
                      'items-center',
                      'justify-center',
                      'rounded-xl',
                      'bg-blue-50',
                      'text-blue-600',
                      'dark:bg-blue-950/50',
                      'dark:text-blue-400',
                    ].join(' ')}
                  >
                    <Upload size={19} />
                  </div>

                  <p
                    className={[
                      'text-sm',
                      'font-medium',
                      'text-gray-700',
                      'dark:text-slate-300',
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
                    PDF, imagem ou
                    documento
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
                    'dark:border-slate-700',
                    'dark:bg-slate-900',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'flex',
                      'h-11',
                      'w-11',
                      'shrink-0',
                      'items-center',
                      'justify-center',
                      'rounded-xl',
                      'bg-white',
                      'shadow-sm',
                      'dark:bg-slate-800',
                    ].join(' ')}
                  >
                    {obterIconeArquivo(
                      arquivo
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
                        arquivo.name
                      }
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
                      ) ||
                        'ARQUIVO'}
                      {' • '}
                      {formatarBytes(
                        arquivo.size
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    title="Remover arquivo"
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
                      'disabled:opacity-40',
                      'dark:hover:bg-red-950/30',
                    ].join(' ')}
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
            </section>
          )}
        </div>

        <div
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
              'rounded-lg',
              'border',
              'border-gray-200',
              'px-4',
              'py-2',
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
            disabled={!podeEnviar}
            onClick={() => {
              void handleEnviar()
            }}
            className={[
              'flex',
              'min-w-[130px]',
              'items-center',
              'justify-center',
              'gap-2',
              'rounded-lg',
              'bg-blue-600',
              'px-4',
              'py-2',
              'text-sm',
              'font-medium',
              'text-white',
              'transition',
              'hover:bg-blue-700',
              'disabled:cursor-not-allowed',
              'disabled:bg-gray-300',
              'disabled:text-gray-500',
              'dark:disabled:bg-slate-800',
              'dark:disabled:text-slate-500',
            ].join(' ')}
          >
            {enviando ? (
              <>
                <Loader2
                  size={15}
                  className="animate-spin"
                />
                Enviando...
              </>
            ) : (
              <>
                <Upload size={15} />
                Adicionar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModalAdicionarDocumento