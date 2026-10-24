import {
  Building2,
  Loader2,
  Pencil,
  Save,
  UserRound,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'

import { supabase } from '../../../../lib/supabaseClient'

type TipoCliente = 'PF' | 'PJ'

interface Props {
  open: boolean
  clienteId: string
  tipoCliente: TipoCliente
  onClose: () => void
  onUpdated?: () => void | Promise<void>
}

interface RegistroBase {
  id: string
  corretora_id: string
  corretor_id: string
  dados: Record<string, any>
  classificacao: string
  created_at: string
  updated_at: string
  cliente_id_legado: string | null
  etapa_kanban: string | null
  posicao_kanban: number | null
}

interface PessoaRegistro extends RegistroBase {
  cpf: string | null
}

interface EmpresaRegistro extends RegistroBase {
  cnpj: string | null
  dados_api_cnpj: Record<string, any>
}

type Registro =
  | PessoaRegistro
  | EmpresaRegistro

const texto = (
  valor: unknown
) =>
  valor === undefined ||
  valor === null
    ? ''
    : String(valor)

const cloneSeguro = <T,>(
  valor: T
): T => {
  if (
    typeof structuredClone ===
    'function'
  ) {
    return structuredClone(valor)
  }

  return JSON.parse(
    JSON.stringify(valor)
  )
}

const formatarDocumento = (
  valor: string | null,
  tipo: TipoCliente
) => {
  const numeros =
    String(valor || '').replace(
      /\D/g,
      ''
    )

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

  return valor || '—'
}

export default function ContactCadastroModal({
  open,
  clienteId,
  tipoCliente,
  onClose,
  onUpdated,
}: Props) {
  const [
    registro,
    setRegistro,
  ] =
    useState<Registro | null>(
      null
    )

  const [
    dados,
    setDados,
  ] = useState<
    Record<string, any>
  >({})

  const [
    dadosApiCnpj,
    setDadosApiCnpj,
  ] = useState<
    Record<string, any>
  >({})

  const [
    classificacao,
    setClassificacao,
  ] = useState('')

  const [
    etapaKanban,
    setEtapaKanban,
  ] = useState('')

  const [
    posicaoKanban,
    setPosicaoKanban,
  ] = useState('')

  const [
    loading,
    setLoading,
  ] = useState(false)

  const [
    editando,
    setEditando,
  ] = useState(false)

  const [
    salvando,
    setSalvando,
  ] = useState(false)

  

  const carregar =
    useCallback(async () => {
      if (
        !open ||
        !clienteId
      ) {
        return
      }

      setLoading(true)

      try {
        const tabela =
          tipoCliente === 'PF'
            ? 'crm_pessoas'
            : 'crm_empresas'

        const {
          data,
          error,
        } = await supabase
          .from(tabela)
          .select('*')
          .eq(
            'id',
            clienteId
          )
          .single()

        if (error) {
          throw error
        }

        if (!data) {
          throw new Error(
            'Cadastro não encontrado.'
          )
        }

        const recebido =
          data as Registro

        setRegistro(
          recebido
        )

        setDados(
          cloneSeguro(
            recebido.dados || {}
          )
        )

        setClassificacao(
          recebido.classificacao ||
            ''
        )

        setEtapaKanban(
          recebido.etapa_kanban ||
            ''
        )

        setPosicaoKanban(
          recebido.posicao_kanban ===
            null ||
            recebido.posicao_kanban ===
              undefined
            ? ''
            : String(
                recebido.posicao_kanban
              )
        )

        if (
          tipoCliente ===
          'PJ'
        ) {
          setDadosApiCnpj(
            cloneSeguro(
              (
                recebido as EmpresaRegistro
              ).dados_api_cnpj ||
                {}
            )
          )
        } else {
          setDadosApiCnpj(
            {}
          )
        }
      } catch (error: any) {
        console.error(
          'Erro ao carregar cadastro completo:',
          error
        )

        setRegistro(null)

        toast.error(
          error?.message ||
            'Não foi possível carregar o cadastro completo.'
        )
      } finally {
        setLoading(false)
      }
    }, [
      open,
      clienteId,
      tipoCliente,
    ])

  useEffect(() => {
    if (!open) return

    setEditando(false)
    

    void carregar()
  }, [open, carregar])

  const cancelarEdicao =
    useCallback(() => {
      if (!registro) {
        setEditando(false)
        return
      }

      setDados(
        cloneSeguro(
          registro.dados || {}
        )
      )

      setClassificacao(
        registro.classificacao ||
          ''
      )

      setEtapaKanban(
        registro.etapa_kanban ||
          ''
      )

      setPosicaoKanban(
        registro.posicao_kanban ===
          null ||
          registro.posicao_kanban ===
            undefined
          ? ''
          : String(
              registro.posicao_kanban
            )
      )

      if (
        tipoCliente ===
        'PJ'
      ) {
        setDadosApiCnpj(
          cloneSeguro(
            (
              registro as EmpresaRegistro
            ).dados_api_cnpj ||
              {}
          )
        )
      }

      setEditando(false)
    }, [
      registro,
      tipoCliente,
    ])

  const salvar =
    useCallback(async () => {
      if (!registro) {
        return
      }

      const nomePessoa =
        texto(
          dados.nome
        ).trim()

      const razaoSocial =
        texto(
          dados.razao_social
        ).trim()

      if (
        tipoCliente === 'PF' &&
        !nomePessoa
      ) {
        toast.error(
          'O nome da pessoa é obrigatório.'
        )
        return
      }

      if (
        tipoCliente === 'PJ' &&
        !razaoSocial
      ) {
        toast.error(
          'A razão social é obrigatória.'
        )
        return
      }

      setSalvando(true)

      try {
        const tabela =
          tipoCliente === 'PF'
            ? 'crm_pessoas'
            : 'crm_empresas'

        /*
         * IMPORTANTE:
         * cpf/cnpj não fazem parte do payload.
         */
        const payload: Record<
          string,
          any
        > = {
          dados,
          classificacao:
            classificacao ||
            'NAO_QUALIFICADO',
          etapa_kanban:
            etapaKanban ||
            null,
          posicao_kanban:
            posicaoKanban.trim()
              ? Number(
                  posicaoKanban
                )
              : null,
        }

        if (
          tipoCliente ===
          'PJ'
        ) {
          payload.dados_api_cnpj =
            dadosApiCnpj
        }

        const {
          data,
          error,
        } = await supabase
          .from(tabela)
          .update(payload)
          .eq(
            'id',
            clienteId
          )
          .select('*')
          .single()

        if (error) {
          throw error
        }

        setRegistro(
          data as Registro
        )

        setDados(
          cloneSeguro(
            data.dados || {}
          )
        )

        if (
          tipoCliente ===
          'PJ'
        ) {
          setDadosApiCnpj(
            cloneSeguro(
              data.dados_api_cnpj ||
                {}
            )
          )
        }

        setEditando(false)

        await onUpdated?.()

        toast.success(
          'Cadastro atualizado.'
        )
      } catch (error: any) {
        console.error(
          'Erro ao atualizar cadastro:',
          error
        )

        toast.error(
          error?.message ||
            'Não foi possível atualizar o cadastro.'
        )
      } finally {
        setSalvando(false)
      }
    }, [
      registro,
      dados,
      dadosApiCnpj,
      classificacao,
      etapaKanban,
      posicaoKanban,
      clienteId,
      tipoCliente,
      onUpdated,
    ])

  const documento =
    useMemo(() => {
      if (!registro) {
        return ''
      }

      return tipoCliente ===
        'PF'
        ? (
            registro as PessoaRegistro
          ).cpf ||
            ''
        : (
            registro as EmpresaRegistro
          ).cnpj ||
            ''
    }, [
      registro,
      tipoCliente,
    ])

  const nome =
    tipoCliente === 'PF'
      ? texto(
          dados.nome
        ) ||
        'Pessoa'
      : texto(
          dados.nome_fantasia
        ) ||
        texto(
          dados.razao_social
        ) ||
        'Empresa'

  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm md:p-6"
      onMouseDown={
        event => {
          if (
            event.target ===
              event.currentTarget &&
            !salvando
          ) {
            onClose()
          }
        }
      }
    >
      <div className="flex h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                tipoCliente ===
                'PF'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-violet-50 text-violet-600'
              }`}
            >
              {tipoCliente ===
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

            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-slate-900">
                Cadastro completo
              </h2>

              <p className="mt-0.5 truncate text-xs text-slate-500">
                {nome} •{' '}
                {tipoCliente ===
                'PF'
                  ? 'Pessoa Física'
                  : 'Pessoa Jurídica'}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {registro &&
              !loading &&
              (editando ? (
                <>
                  <button
                    type="button"
                    disabled={
                      salvando
                    }
                    onClick={
                      cancelarEdicao
                    }
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <X
                      size={14}
                    />
                    Cancelar
                  </button>

                  <button
                    type="button"
                    disabled={
                      salvando
                    }
                    onClick={() =>
                      void salvar()
                    }
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {salvando ? (
                      <Loader2
                        size={14}
                        className="animate-spin"
                      />
                    ) : (
                      <Save
                        size={14}
                      />
                    )}

                    {salvando
                      ? 'Salvando...'
                      : 'Salvar alterações'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setEditando(
                      true
                    )
                  }
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  <Pencil
                    size={14}
                  />
                  Editar cadastro
                </button>
              ))}

            <button
              type="button"
              disabled={salvando}
              onClick={
                onClose
              }
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            >
              <X size={17} />
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
          {loading ? (
            <div className="flex h-full min-h-[300px] items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2
                size={18}
                className="animate-spin"
              />
              Carregando cadastro completo...
            </div>
          ) : !registro ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
              Não foi possível carregar o cadastro.
            </div>
          ) : (
            <div className="space-y-4">
              <Section
                title="Identificação"
                icon={
                  tipoCliente ===
                  'PF' ? (
                    <UserRound
                      size={16}
                    />
                  ) : (
                    <Building2
                      size={16}
                    />
                  )
                }
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {tipoCliente ===
                  'PF' ? (
                    <EditableField
                      label="Nome"
                      value={
                        dados.nome
                      }
                      editando={
                        editando
                      }
                      onChange={
                        value =>
                          setDados(
                            atual => ({
                              ...atual,
                              nome: value,
                            })
                          )
                      }
                    />
                  ) : (
                    <>
                      <EditableField
                        label="Razão social"
                        value={
                          dados.razao_social
                        }
                        editando={
                          editando
                        }
                        onChange={
                          value =>
                            setDados(
                              atual => ({
                                ...atual,
                                razao_social:
                                  value,
                              })
                            )
                        }
                      />

                      <EditableField
                        label="Nome fantasia"
                        value={
                          dados.nome_fantasia
                        }
                        editando={
                          editando
                        }
                        onChange={
                          value =>
                            setDados(
                              atual => ({
                                ...atual,
                                nome_fantasia:
                                  value,
                              })
                            )
                        }
                      />
                    </>
                  )}

                  <ReadOnlyField
                    label={
                      tipoCliente ===
                      'PF'
                        ? 'CPF'
                        : 'CNPJ'
                    }
                    value={formatarDocumento(
                      documento,
                      tipoCliente
                    )}
                    destaque
                  />

                  <EditableField
                    label="Modo de cadastro"
                    value={
                      dados.modo_cadastro
                    }
                    editando={
                      editando
                    }
                    onChange={
                      value =>
                        setDados(
                          atual => ({
                            ...atual,
                            modo_cadastro:
                              value,
                          })
                        )
                    }
                  />
                </div>
              </Section>

              {tipoCliente ===
                'PF' && (
                <Section title="Dados pessoais">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <EditableField
                      label="Data de nascimento"
                      type="date"
                      value={
                        dados.data_nascimento
                      }
                      editando={
                        editando
                      }
                      onChange={
                        value =>
                          setDados(
                            atual => ({
                              ...atual,
                              data_nascimento:
                                value ||
                                null,
                            })
                          )
                      }
                    />

                    <EditableField
                      label="Sexo"
                      value={
                        dados.sexo
                      }
                      editando={
                        editando
                      }
                      onChange={
                        value =>
                          setDados(
                            atual => ({
                              ...atual,
                              sexo:
                                value,
                            })
                          )
                      }
                    />

                    <EditableField
                      label="Estado civil"
                      value={
                        dados.estado_civil
                      }
                      editando={
                        editando
                      }
                      onChange={
                        value =>
                          setDados(
                            atual => ({
                              ...atual,
                              estado_civil:
                                value,
                            })
                          )
                      }
                    />

                    <EditableField
                      label="Naturalidade"
                      value={
                        dados.naturalidade
                      }
                      editando={
                        editando
                      }
                      onChange={
                        value =>
                          setDados(
                            atual => ({
                              ...atual,
                              naturalidade:
                                value,
                            })
                          )
                      }
                    />

                    <EditableField
                      label="Ocupação"
                      value={
                        dados.ocupacao
                      }
                      editando={
                        editando
                      }
                      onChange={
                        value =>
                          setDados(
                            atual => ({
                              ...atual,
                              ocupacao:
                                value,
                            })
                          )
                      }
                    />

                    <BooleanField
                      label="PEP"
                      value={
                        dados.pep
                      }
                      editando={
                        editando
                      }
                      onChange={
                        value =>
                          setDados(
                            atual => ({
                              ...atual,
                              pep: value,
                            })
                          )
                      }
                    />
                  </div>
                </Section>
              )}

              {tipoCliente ===
                'PJ' && (
                <Section title="Dados empresariais">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <EditableField
                      label="Situação cadastral"
                      value={
                        dados.situacao_cadastral
                      }
                      editando={
                        editando
                      }
                      onChange={
                        value =>
                          atualizarCampoDados(
                            setDados,
                            'situacao_cadastral',
                            value
                          )
                      }
                    />

                    <EditableField
                      label="Data de abertura"
                      type="date"
                      value={
                        dados.data_abertura
                      }
                      editando={
                        editando
                      }
                      onChange={
                        value =>
                          atualizarCampoDados(
                            setDados,
                            'data_abertura',
                            value ||
                              null
                          )
                      }
                    />

                    <EditableField
                      label="Porte"
                      value={
                        dados.porte
                      }
                      editando={
                        editando
                      }
                      onChange={
                        value =>
                          atualizarCampoDados(
                            setDados,
                            'porte',
                            value
                          )
                      }
                    />

                    <EditableField
                      label="Matriz / filial"
                      value={
                        dados.matriz_filial
                      }
                      editando={
                        editando
                      }
                      onChange={
                        value =>
                          atualizarCampoDados(
                            setDados,
                            'matriz_filial',
                            value
                          )
                      }
                    />

                    <EditableField
                      label="Natureza jurídica"
                      value={
                        dados.natureza_juridica
                      }
                      editando={
                        editando
                      }
                      onChange={
                        value =>
                          atualizarCampoDados(
                            setDados,
                            'natureza_juridica',
                            value
                          )
                      }
                    />

                    <EditableField
                      label="Capital social"
                      type="number"
                      value={
                        dados.capital_social
                      }
                      editando={
                        editando
                      }
                      onChange={
                        value =>
                          atualizarCampoDados(
                            setDados,
                            'capital_social',
                            value
                              ? Number(
                                  value
                                )
                              : null
                          )
                      }
                    />

                    <EditableField
                      label="CNAE principal"
                      value={
                        dados.cnae_principal
                      }
                      editando={
                        editando
                      }
                      onChange={
                        value =>
                          atualizarCampoDados(
                            setDados,
                            'cnae_principal',
                            value
                          )
                      }
                    />

                    <EditableField
                      label="Descrição CNAE"
                      value={
                        dados.cnae_principal_descricao
                      }
                      editando={
                        editando
                      }
                      onChange={
                        value =>
                          atualizarCampoDados(
                            setDados,
                            'cnae_principal_descricao',
                            value
                          )
                      }
                    />

                    <BooleanField
                      label="Optante MEI"
                      value={
                        dados.opcao_pelo_mei
                      }
                      editando={
                        editando
                      }
                      onChange={
                        value =>
                          atualizarCampoDados(
                            setDados,
                            'opcao_pelo_mei',
                            value
                          )
                      }
                    />

                    <BooleanField
                      label="Optante Simples"
                      value={
                        dados.opcao_pelo_simples
                      }
                      editando={
                        editando
                      }
                      onChange={
                        value =>
                          atualizarCampoDados(
                            setDados,
                            'opcao_pelo_simples',
                            value
                          )
                      }
                    />
                  </div>
                </Section>
              )}

              <Section title="CRM">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <EditableField
                    label="Origem"
                    value={
                      dados.origem
                    }
                    editando={
                      editando
                    }
                    onChange={
                      value =>
                        atualizarCampoDados(
                          setDados,
                          'origem',
                          value
                        )
                    }
                  />

                  <EditableField
                    label="Canal de entrada"
                    value={
                      dados.canal_entrada
                    }
                    editando={
                      editando
                    }
                    onChange={
                      value =>
                        atualizarCampoDados(
                          setDados,
                          'canal_entrada',
                          value
                        )
                    }
                  />

                  <EditableField
                    label="Fase de atendimento"
                    value={
                      dados.fase_atendimento
                    }
                    editando={
                      editando
                    }
                    onChange={
                      value =>
                        atualizarCampoDados(
                          setDados,
                          'fase_atendimento',
                          value
                        )
                    }
                  />

                  <EditableField
                    label="Temperatura"
                    value={
                      dados.temperatura
                    }
                    editando={
                      editando
                    }
                    onChange={
                      value =>
                        atualizarCampoDados(
                          setDados,
                          'temperatura',
                          value
                        )
                    }
                  />

                  <SelectField
                    label="Classificação"
                    value={
                      classificacao
                    }
                    editando={
                      editando
                    }
                    options={[
                      {
                        value:
                          'NAO_QUALIFICADO',
                        label:
                          'Não qualificado',
                      },
                      {
                        value:
                          'LEAD',
                        label:
                          'Lead',
                      },
                    ]}
                    onChange={
                      setClassificacao
                    }
                  />

                  <SelectField
                    label="Etapa Kanban"
                    value={
                      etapaKanban
                    }
                    editando={
                      editando
                    }
                    allowEmpty
                    options={[
                      {
                        value:
                          'prospeccao',
                        label:
                          'Prospecção',
                      },
                      {
                        value:
                          'negociacao',
                        label:
                          'Negociação',
                      },
                      {
                        value:
                          'fechamento',
                        label:
                          'Fechamento',
                      },
                      {
                        value:
                          'pos_venda',
                        label:
                          'Pós-venda',
                      },
                      {
                        value:
                          'perdido',
                        label:
                          'Perdido',
                      },
                      {
                        value:
                          'assistencia',
                        label:
                          'Assistência',
                      },
                      {
                        value:
                          'sinistro',
                        label:
                          'Sinistro',
                      },
                    ]}
                    onChange={
                      setEtapaKanban
                    }
                  />

                  <EditableField
                    label="Posição Kanban"
                    type="number"
                    value={
                      posicaoKanban
                    }
                    editando={
                      editando
                    }
                    onChange={
                      setPosicaoKanban
                    }
                  />
                </div>
              </Section>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function atualizarCampoDados(
  setter: React.Dispatch<
    React.SetStateAction<
      Record<string, any>
    >
  >,
  campo: string,
  valor: any
) {
  setter(atual => ({
    ...atual,
    [campo]: valor,
  }))
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center gap-2 text-slate-500">
        {icon}

        <h3 className="text-xs font-bold uppercase tracking-wide">
          {title}
        </h3>
      </div>

      {children}
    </section>
  )
}

function EditableField({
  label,
  value,
  editando,
  onChange,
  type = 'text',
}: {
  label: string
  value?: any
  editando: boolean
  onChange: (
    value: string
  ) => void
  type?:
    | 'text'
    | 'date'
    | 'number'
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      {editando ? (
        <input
          type={type}
          value={texto(
            value
          )}
          onChange={
            event =>
              onChange(
                event.target
                  .value
              )
          }
          className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      ) : (
        <div className="mt-1 break-words text-sm font-medium text-slate-700">
          {texto(value) ||
            '—'}
        </div>
      )}
    </div>
  )
}

function ReadOnlyField({
  label,
  value,
  destaque = false,
}: {
  label: string
  value: ReactNode
  destaque?: boolean
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <div
        className={`mt-1 break-words text-sm font-medium ${
          destaque
            ? 'text-blue-700'
            : 'text-slate-700'
        }`}
      >
        {value || '—'}
      </div>
    </div>
  )
}

function BooleanField({
  label,
  value,
  editando,
  onChange,
}: {
  label: string
  value?:
    | boolean
    | null
  editando: boolean
  onChange: (
    value:
      | boolean
      | null
  ) => void
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      {editando ? (
        <select
          value={
            value === true
              ? 'true'
              : value ===
                  false
                ? 'false'
                : ''
          }
          onChange={
            event => {
              if (
                !event.target
                  .value
              ) {
                onChange(
                  null
                )
                return
              }

              onChange(
                event.target
                  .value ===
                  'true'
              )
            }
          }
          className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400"
        >
          <option value="">
            Não informado
          </option>

          <option value="true">
            Sim
          </option>

          <option value="false">
            Não
          </option>
        </select>
      ) : (
        <div className="mt-1 text-sm font-medium text-slate-700">
          {value === true
            ? 'Sim'
            : value ===
                false
              ? 'Não'
              : '—'}
        </div>
      )}
    </div>
  )
}

function SelectField({
  label,
  value,
  editando,
  options,
  allowEmpty = false,
  onChange,
}: {
  label: string
  value: string
  editando: boolean
  options: {
    value: string
    label: string
  }[]
  allowEmpty?: boolean
  onChange: (
    value: string
  ) => void
}) {
  const labelAtual =
    options.find(
      item =>
        item.value ===
        value
    )?.label ||
    value ||
    '—'

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      {editando ? (
        <select
          value={value}
          onChange={
            event =>
              onChange(
                event.target
                  .value
              )
          }
          className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400"
        >
          {allowEmpty && (
            <option value="">
              Não definido
            </option>
          )}

          {options.map(
            option => (
              <option
                key={
                  option.value
                }
                value={
                  option.value
                }
              >
                {
                  option.label
                }
              </option>
            )
          )}
        </select>
      ) : (
        <div className="mt-1 text-sm font-medium text-slate-700">
          {labelAtual}
        </div>
      )}
    </div>
  )
}



