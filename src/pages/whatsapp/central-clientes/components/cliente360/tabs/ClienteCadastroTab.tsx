import {
  Building2,
  Mail,
  MapPin,
  Plus,
  Save,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import {
  atualizarEmpresa,
  atualizarPessoa,
  buscarEmpresaPorId,
  buscarPessoaPorId,
  buscarVinculosDaEmpresa,
  buscarVinculosDaPessoa,
  type CrmCnae,
  type CrmContatoEmpresa,
  type CrmEmail,
  type CrmEmpresa,
  type CrmEndereco,
  type CrmPessoa,
  type CrmTelefone,
} from '../../../../services/crmClienteService'
import type {
  ClienteCentral,
  ResponsavelCentral,
} from '../../../types/centralClientes'
import {
  formatarDocumento,
  
} from '../../../utils/clienteFormatters'
import { useAuth } from '../../../../../../auth/AuthContext'

import {
  formatCurrency,
  maskCEP,
  maskPhone,
} from '../../../../utils/masks'
import {
  parseCEP,
  parseCurrencyToNumber,
  parsePhone,
} from '../../../../utils/parsers'

interface Props {
  cliente: ClienteCentral
  responsaveis: ResponsavelCentral[]
  onTransferir: (
    cliente: ClienteCentral,
    responsavelId: string
  ) => Promise<void>
  onUpdated: () => Promise<void>
}

type RegistroCompleto = CrmPessoa | CrmEmpresa
type VinculoResumo = {
  id: string
  nome: string
  documento: string | null
  papel: string | null
  origem: string | null
}

const gerarId = () =>
  typeof crypto !== 'undefined' &&
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

const texto = (valor: unknown) =>
  valor === undefined || valor === null
    ? ''
    : String(valor)

const arrayTexto = (valor: unknown) =>
  Array.isArray(valor)
    ? valor.filter(Boolean).join(', ')
    : ''

const parseLista = (valor: string) =>
  valor
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)

const formatarData = (valor?: string | null) => {
  if (!valor) return '—'

  const partes = valor.split('-')
  if (partes.length !== 3) return valor

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

const formatarBoolean = (
  valor: boolean | null | undefined
) => {
  if (valor === true) return 'Sim'
  if (valor === false) return 'Não'
  return '—'
}

export default function ClienteCadastroTab({
  cliente,
  responsaveis,
  onTransferir,
  onUpdated,
}: Props) {
  const { userProfile } = useAuth()

  const podeAlterarResponsavel =
    userProfile?.tipo_usuario === 'CORRETORA'

  const [responsavelId, setResponsavelId] = useState('')
  const [registro, setRegistro] =
    useState<RegistroCompleto | null>(null)
  const [vinculos, setVinculos] = useState<
    VinculoResumo[]
  >([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  

  
  const [dados, setDados] = useState<Record<string, any>>({})
  

  const carregar = useCallback(async () => {
    setLoading(true)

    try {
      if (cliente.tipo === 'PF') {
  const [pessoa, relacionamentos] =
    await Promise.all([
      buscarPessoaPorId(cliente.id),
      buscarVinculosDaPessoa(cliente.id),
    ])

  if (!pessoa) {
    throw new Error('Pessoa não encontrada.')
  }

  setRegistro(pessoa)
  setResponsavelId(pessoa.corretor_id || '')
  
  setDados(structuredClone(pessoa.dados || {}))

  setVinculos(
    relacionamentos.map(item => ({
      id: item.id,
      nome:
        item.empresa?.dados?.nome_fantasia ||
        item.empresa?.dados?.razao_social ||
        'Empresa',
      documento: item.empresa?.cnpj || null,
      papel: item.papel,
      origem: item.origem_vinculo,
    }))
  )
} else {
  const [empresa, relacionamentos] =
    await Promise.all([
      buscarEmpresaPorId(cliente.id),
      buscarVinculosDaEmpresa(cliente.id),
    ])

  if (!empresa) {
    throw new Error('Empresa não encontrada.')
  }

  setRegistro(empresa)
  setResponsavelId(empresa.corretor_id || '')
  
  setDados(structuredClone(empresa.dados || {}))

  setVinculos(
    relacionamentos.map(item => ({
      id: item.id,
      nome:
        item.pessoa?.dados?.nome ||
        'Pessoa',
      documento: item.pessoa?.cpf || null,
      papel: item.papel,
      origem: item.origem_vinculo,
    }))
  )
}
    } catch (error: any) {
      toast.error(
        error?.message ||
          'Não foi possível carregar o cadastro.'
      )
    } finally {
      setLoading(false)
    }
  }, [cliente.id, cliente.tipo])

  useEffect(() => {
    setEditando(false)
    void carregar()
  }, [carregar])

  const atualizarCampo = (
    campo: string,
    valor: any
  ) => {
    setDados(atual => ({
      ...atual,
      [campo]: valor,
    }))
  }

  const atualizarDocumentoPessoa = (
    campo: string,
    valor: any
  ) => {
    setDados(atual => ({
      ...atual,
      documentos: {
        ...(atual.documentos || {}),
        [campo]: valor,
      },
    }))
  }

  const atualizarTelefone = (
    index: number,
    patch: Partial<CrmTelefone>
  ) => {
    setDados(atual => ({
      ...atual,
      telefones: (atual.telefones || []).map(
        (item: CrmTelefone, i: number) =>
          i === index
            ? { ...item, ...patch }
            : item
      ),
    }))
  }

  const adicionarTelefone = () => {
    setDados(atual => ({
      ...atual,
      telefones: [
        ...(atual.telefones || []),
        {
          id: gerarId(),
          numero: '',
          tipo: 'CELULAR',
          whatsapp: false,
          principal:
            !(atual.telefones || []).length,
          observacao: null,
        },
      ],
    }))
  }

  const removerTelefone = (index: number) => {
    setDados(atual => ({
      ...atual,
      telefones: (atual.telefones || []).filter(
        (_: any, i: number) => i !== index
      ),
    }))
  }

  const atualizarEmail = (
    index: number,
    patch: Partial<CrmEmail>
  ) => {
    setDados(atual => ({
      ...atual,
      emails: (atual.emails || []).map(
        (item: CrmEmail, i: number) =>
          i === index
            ? { ...item, ...patch }
            : item
      ),
    }))
  }

  const adicionarEmail = () => {
    setDados(atual => ({
      ...atual,
      emails: [
        ...(atual.emails || []),
        {
          id: gerarId(),
          email: '',
          tipo: 'PESSOAL',
          principal: !(atual.emails || []).length,
          observacao: null,
        },
      ],
    }))
  }

  const removerEmail = (index: number) => {
    setDados(atual => ({
      ...atual,
      emails: (atual.emails || []).filter(
        (_: any, i: number) => i !== index
      ),
    }))
  }

  const atualizarEndereco = (
    index: number,
    patch: Partial<CrmEndereco>
  ) => {
    setDados(atual => ({
      ...atual,
      enderecos: (atual.enderecos || []).map(
        (item: CrmEndereco, i: number) =>
          i === index
            ? { ...item, ...patch }
            : item
      ),
    }))
  }

  const adicionarEndereco = () => {
    setDados(atual => ({
      ...atual,
      enderecos: [
        ...(atual.enderecos || []),
        {
          id: gerarId(),
          tipo: 'RESIDENCIAL',
          principal:
            !(atual.enderecos || []).length,
          cep: null,
          logradouro: null,
          numero: null,
          complemento: null,
          bairro: null,
          municipio: null,
          uf: null,
          observacao: null,
        },
      ],
    }))
  }

  const removerEndereco = (index: number) => {
    setDados(atual => ({
      ...atual,
      enderecos: (atual.enderecos || []).filter(
        (_: any, i: number) => i !== index
      ),
    }))
  }

  const atualizarContato = (
    index: number,
    patch: Partial<CrmContatoEmpresa>
  ) => {
    setDados(atual => ({
      ...atual,
      contatos: (atual.contatos || []).map(
        (item: CrmContatoEmpresa, i: number) =>
          i === index
            ? { ...item, ...patch }
            : item
      ),
    }))
  }

  const adicionarContato = () => {
    setDados(atual => ({
      ...atual,
      contatos: [
        ...(atual.contatos || []),
        {
          id: gerarId(),
          nome: '',
          telefone: null,
          email: null,
          cargo: null,
          departamento: null,
          principal:
            !(atual.contatos || []).length,
          observacao: null,
        },
      ],
    }))
  }

  const removerContato = (index: number) => {
    setDados(atual => ({
      ...atual,
      contatos: (atual.contatos || []).filter(
        (_: any, i: number) => i !== index
      ),
    }))
  }

  const atualizarCnae = (
    index: number,
    patch: Partial<CrmCnae>
  ) => {
    setDados(atual => ({
      ...atual,
      cnaes_secundarios: (
        atual.cnaes_secundarios || []
      ).map((item: CrmCnae, i: number) =>
        i === index
          ? { ...item, ...patch }
          : item
      ),
    }))
  }

  const adicionarCnae = () => {
    setDados(atual => ({
      ...atual,
      cnaes_secundarios: [
        ...(atual.cnaes_secundarios || []),
        {
          codigo: '',
          descricao: null,
          principal: false,
        },
      ],
    }))
  }

  const removerCnae = (index: number) => {
    setDados(atual => ({
      ...atual,
      cnaes_secundarios: (
        atual.cnaes_secundarios || []
      ).filter(
        (_: any, i: number) => i !== index
      ),
    }))
  }

  const cancelarEdicao = () => {
    setEditando(false)
    void carregar()
  }

  const salvar = async () => {
    if (!registro) return

    setSalvando(true)

    try {
      

      if (cliente.tipo === 'PF') {
  const nome = texto(dados.nome).trim()

  if (!nome) {
    throw new Error(
      'O nome da pessoa é obrigatório.'
    )
  }

  await atualizarPessoa(cliente.id, {
    dados: {
      ...dados,
      nome,
    },
  })
} else {
  const razaoSocial = texto(
    dados.razao_social
  ).trim()

  if (!razaoSocial) {
    throw new Error(
      'A razão social é obrigatória.'
    )
  }

  await atualizarEmpresa(cliente.id, {
    dados: {
      ...dados,
      razao_social: razaoSocial,
    },
  })
}

      const responsavelAtualId = registro.corretor_id || ''
      const responsavelAlterado =
        podeAlterarResponsavel &&
        responsavelId &&
        responsavelId !== responsavelAtualId

      if (responsavelAlterado) {
        await onTransferir(cliente, responsavelId)
      }

      await carregar()
      await onUpdated()
      setEditando(false)
      toast.success('Cadastro atualizado.')
    } catch (error: any) {
      toast.error(
        error?.message ||
          'Não foi possível atualizar o cadastro.'
      )
    } finally {
      setSalvando(false)
    }
  }

  if (loading && !registro) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-sm text-slate-500">
        Carregando cadastro...
      </div>
    )
  }

  if (!registro) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
        Não foi possível carregar o cadastro completo.
      </div>
    )
  }

  const isPF = cliente.tipo === 'PF'
  const Icon = isPF ? UserRound : Building2
  const telefones: CrmTelefone[] =
    dados.telefones || []
  const emails: CrmEmail[] = dados.emails || []
  const enderecos: CrmEndereco[] =
    dados.enderecos || []
  const contatos: CrmContatoEmpresa[] =
    dados.contatos || []
  const cnaes: CrmCnae[] =
    dados.cnaes_secundarios || []

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            Cadastro completo
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Todos os dados cadastrais armazenados no novo núcleo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {editando && (
            <button
              type="button"
              onClick={cancelarEdicao}
              disabled={salvando}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <X size={14} />
              Cancelar
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              editando
                ? void salvar()
                : setEditando(true)
            }
            disabled={salvando}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={14} />
            {salvando
              ? 'Salvando...'
              : editando
                ? 'Salvar alterações'
                : 'Editar cadastro'}
          </button>
        </div>
      </div>

      <Section
        icon={<Icon size={16} />}
        title="Identificação"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {isPF ? (
            <>
              <Campo
                label="Nome"
                editando={editando}
                value={dados.nome}
                onChange={value =>
                  atualizarCampo('nome', value)
                }
              />
              <ReadOnlyField
                label="CPF"
                value={
                  'cpf' in registro && registro.cpf
                    ? formatarDocumento(
                        registro.cpf,
                        'PF'
                      )
                    : '—'
                }
              />
            </>
          ) : (
            <>
              <Campo
                label="Razão social"
                editando={editando}
                value={dados.razao_social}
                onChange={value =>
                  atualizarCampo(
                    'razao_social',
                    value
                  )
                }
              />
              <Campo
                label="Nome fantasia"
                editando={editando}
                value={dados.nome_fantasia}
                onChange={value =>
                  atualizarCampo(
                    'nome_fantasia',
                    value
                  )
                }
              />
              <ReadOnlyField
                label="CNPJ"
                value={
                  'cnpj' in registro && registro.cnpj
                    ? formatarDocumento(
                        registro.cnpj,
                        'PJ'
                      )
                    : '—'
                }
              />
            </>
          )}

          <Campo
            label="Modo de cadastro"
            editando={editando}
            value={dados.modo_cadastro}
            onChange={value =>
              atualizarCampo(
                'modo_cadastro',
                value
              )
            }
          />

          <ReadOnlyField
            label="Classificação"
            value={registro.classificacao}
          />

          {editando && podeAlterarResponsavel ? (
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Responsável
              </p>

              <select
                value={responsavelId}
                onChange={event =>
                  setResponsavelId(event.target.value)
                }
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">
                  Selecione o responsável
                </option>

                {responsaveis.map(responsavel => (
                  <option
                    key={responsavel.id}
                    value={responsavel.id}
                  >
                    {responsavel.nome}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <ReadOnlyField
              label="Responsável"
              value={
                cliente.responsavelNome ||
                'Não identificado'
              }
            />
          )}
        </div>
      </Section>

      {isPF ? (
        <>
          <Section
            icon={<UserRound size={16} />}
            title="Dados pessoais"
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Campo
                label="Data de nascimento"
                type="date"
                editando={editando}
                value={dados.data_nascimento}
                visualValue={formatarData(
                  dados.data_nascimento
                )}
                onChange={value =>
                  atualizarCampo(
                    'data_nascimento',
                    value
                  )
                }
              />

              <Campo
                label="Sexo"
                editando={editando}
                value={dados.sexo}
                onChange={value =>
                  atualizarCampo('sexo', value)
                }
              />

              <Campo
                label="Estado civil"
                editando={editando}
                value={dados.estado_civil}
                onChange={value =>
                  atualizarCampo(
                    'estado_civil',
                    value
                  )
                }
              />

              <Campo
                label="Naturalidade"
                editando={editando}
                value={dados.naturalidade}
                onChange={value =>
                  atualizarCampo(
                    'naturalidade',
                    value
                  )
                }
              />

              <Campo
                label="Ocupação"
                editando={editando}
                value={dados.ocupacao}
                onChange={value =>
                  atualizarCampo(
                    'ocupacao',
                    value
                  )
                }
              />

              <BooleanField
                label="Pessoa exposta politicamente (PEP)"
                editando={editando}
                value={dados.pep}
                onChange={value =>
                  atualizarCampo('pep', value)
                }
              />
            </div>
          </Section>

          <Section
            title="Documentos"
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Campo
                label="RG"
                editando={editando}
                value={
                  dados.documentos?.rg_numero
                }
                onChange={value =>
                  atualizarDocumentoPessoa(
                    'rg_numero',
                    value
                  )
                }
              />

              <Campo
                label="Órgão emissor"
                editando={editando}
                value={
                  dados.documentos?.rg_orgao
                }
                onChange={value =>
                  atualizarDocumentoPessoa(
                    'rg_orgao',
                    value
                  )
                }
              />

              <Campo
                label="Emissão do RG"
                type="date"
                editando={editando}
                value={
                  dados.documentos
                    ?.data_emissao_rg
                }
                visualValue={formatarData(
                  dados.documentos
                    ?.data_emissao_rg
                )}
                onChange={value =>
                  atualizarDocumentoPessoa(
                    'data_emissao_rg',
                    value
                  )
                }
              />

              <Campo
                label="CNH"
                editando={editando}
                value={
                  dados.documentos?.cnh_numero
                }
                onChange={value =>
                  atualizarDocumentoPessoa(
                    'cnh_numero',
                    value
                  )
                }
              />

              <Campo
                label="Categoria CNH"
                editando={editando}
                value={
                  dados.documentos
                    ?.cnh_categoria
                }
                onChange={value =>
                  atualizarDocumentoPessoa(
                    'cnh_categoria',
                    value
                  )
                }
              />

              <Campo
                label="Validade CNH"
                type="date"
                editando={editando}
                value={
                  dados.documentos?.cnh_validade
                }
                visualValue={formatarData(
                  dados.documentos?.cnh_validade
                )}
                onChange={value =>
                  atualizarDocumentoPessoa(
                    'cnh_validade',
                    value
                  )
                }
              />
            </div>
          </Section>
        </>
      ) : (
        <>
          <Section
            icon={<Building2 size={16} />}
            title="Dados empresariais"
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Campo
                label="Situação cadastral"
                editando={editando}
                value={dados.situacao_cadastral}
                onChange={value =>
                  atualizarCampo(
                    'situacao_cadastral',
                    value
                  )
                }
              />

              <Campo
                label="Data de abertura"
                type="date"
                editando={editando}
                value={dados.data_abertura}
                visualValue={formatarData(
                  dados.data_abertura
                )}
                onChange={value =>
                  atualizarCampo(
                    'data_abertura',
                    value
                  )
                }
              />

              <Campo
                label="Porte"
                editando={editando}
                value={dados.porte}
                onChange={value =>
                  atualizarCampo('porte', value)
                }
              />

              <Campo
                label="Matriz / filial"
                editando={editando}
                value={dados.matriz_filial}
                onChange={value =>
                  atualizarCampo(
                    'matriz_filial',
                    value
                  )
                }
              />

              <Campo
                label="Natureza jurídica"
                editando={editando}
                value={dados.natureza_juridica}
                onChange={value =>
                  atualizarCampo(
                    'natureza_juridica',
                    value
                  )
                }
              />

              <Campo
                label="Capital social"
                editando={editando}
                value={dados.capital_social}
                formatter={formatCurrency}
                parser={parseCurrencyToNumber}
                inputMode="decimal"
                onChange={value =>
                  atualizarCampo(
                    'capital_social',
                    value
                  )
                }
              />

              <BooleanField
                label="Optante pelo MEI"
                editando={editando}
                value={dados.opcao_pelo_mei}
                onChange={value =>
                  atualizarCampo(
                    'opcao_pelo_mei',
                    value
                  )
                }
              />

              <BooleanField
                label="Optante pelo Simples"
                editando={editando}
                value={dados.opcao_pelo_simples}
                onChange={value =>
                  atualizarCampo(
                    'opcao_pelo_simples',
                    value
                  )
                }
              />
            </div>
          </Section>

          <Section title="Atividade econômica">
            <div className="grid gap-3 md:grid-cols-2">
              <Campo
                label="CNAE principal"
                editando={editando}
                value={dados.cnae_principal}
                onChange={value =>
                  atualizarCampo(
                    'cnae_principal',
                    value
                  )
                }
              />

              <Campo
                label="Descrição do CNAE principal"
                editando={editando}
                value={
                  dados.cnae_principal_descricao
                }
                onChange={value =>
                  atualizarCampo(
                    'cnae_principal_descricao',
                    value
                  )
                }
              />
            </div>

            <div className="mt-4 space-y-2">
              <SubHeader
                title="CNAEs secundários"
                editando={editando}
                onAdd={adicionarCnae}
              />

              {!cnaes.length ? (
                <EmptyText text="Nenhum CNAE secundário cadastrado." />
              ) : (
                cnaes.map((cnae, index) => (
                  <div
                    key={`${cnae.codigo}-${index}`}
                    className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[180px_1fr_auto]"
                  >
                    <Campo
                      label="Código"
                      editando={editando}
                      value={cnae.codigo}
                      onChange={value =>
                        atualizarCnae(index, {
                          codigo: value,
                        })
                      }
                    />

                    <Campo
                      label="Descrição"
                      editando={editando}
                      value={cnae.descricao}
                      onChange={value =>
                        atualizarCnae(index, {
                          descricao: value,
                        })
                      }
                    />

                    {editando && (
                      <DeleteButton
                        onClick={() =>
                          removerCnae(index)
                        }
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          </Section>
        </>
      )}

      <Section
        icon={<Mail size={16} />}
        title="Telefones"
      >
        <SubHeader
          title={`${telefones.length} telefone(s)`}
          editando={editando}
          onAdd={adicionarTelefone}
        />

        <div className="mt-3 space-y-2">
          {!telefones.length ? (
            <EmptyText text="Nenhum telefone cadastrado." />
          ) : (
            telefones.map((telefone, index) => (
              <div
                key={telefone.id || index}
                className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-2 xl:grid-cols-6"
              >
                <Campo
                  label="Número"
                  editando={editando}
                  value={telefone.numero}
                  formatter={maskPhone}
                  parser={parsePhone}
                  inputMode="tel"
                  onChange={value =>
                    atualizarTelefone(index, {
                      numero: value,
                    })
                  }
                />

                <Campo
                  label="Tipo"
                  editando={editando}
                  value={telefone.tipo}
                  onChange={value =>
                    atualizarTelefone(index, {
                      tipo: value,
                    })
                  }
                />

                <BooleanField
                  label="WhatsApp"
                  editando={editando}
                  value={telefone.whatsapp}
                  onChange={value =>
                    atualizarTelefone(index, {
                      whatsapp: value ?? false,
                    })
                  }
                />

                <BooleanField
                  label="Principal"
                  editando={editando}
                  value={telefone.principal}
                  onChange={value =>
                    atualizarTelefone(index, {
                      principal: value ?? false,
                    })
                  }
                />

                <Campo
                  label="Observação"
                  editando={editando}
                  value={telefone.observacao}
                  onChange={value =>
                    atualizarTelefone(index, {
                      observacao: value,
                    })
                  }
                />

                {editando && (
                  <DeleteButton
                    onClick={() =>
                      removerTelefone(index)
                    }
                  />
                )}
              </div>
            ))
          )}
        </div>
      </Section>

      <Section
        icon={<Mail size={16} />}
        title="E-mails"
      >
        <SubHeader
          title={`${emails.length} e-mail(s)`}
          editando={editando}
          onAdd={adicionarEmail}
        />

        <div className="mt-3 space-y-2">
          {!emails.length ? (
            <EmptyText text="Nenhum e-mail cadastrado." />
          ) : (
            emails.map((email, index) => (
              <div
                key={email.id || index}
                className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-2 xl:grid-cols-5"
              >
                <Campo
                  label="E-mail"
                  editando={editando}
                  value={email.email}
                  onChange={value =>
                    atualizarEmail(index, {
                      email: value,
                    })
                  }
                />

                <Campo
                  label="Tipo"
                  editando={editando}
                  value={email.tipo}
                  onChange={value =>
                    atualizarEmail(index, {
                      tipo: value,
                    })
                  }
                />

                <BooleanField
                  label="Principal"
                  editando={editando}
                  value={email.principal}
                  onChange={value =>
                    atualizarEmail(index, {
                      principal: value ?? false,
                    })
                  }
                />

                <Campo
                  label="Observação"
                  editando={editando}
                  value={email.observacao}
                  onChange={value =>
                    atualizarEmail(index, {
                      observacao: value,
                    })
                  }
                />

                {editando && (
                  <DeleteButton
                    onClick={() =>
                      removerEmail(index)
                    }
                  />
                )}
              </div>
            ))
          )}
        </div>
      </Section>

      <Section
        icon={<MapPin size={16} />}
        title="Endereços"
      >
        <SubHeader
          title={`${enderecos.length} endereço(s)`}
          editando={editando}
          onAdd={adicionarEndereco}
        />

        <div className="mt-3 space-y-3">
          {!enderecos.length ? (
            <EmptyText text="Nenhum endereço cadastrado." />
          ) : (
            enderecos.map((endereco, index) => (
              <div
                key={endereco.id || index}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Campo
                    label="Tipo"
                    editando={editando}
                    value={endereco.tipo}
                    onChange={value =>
                      atualizarEndereco(index, {
                        tipo: value,
                      })
                    }
                  />

                  <BooleanField
                    label="Principal"
                    editando={editando}
                    value={endereco.principal}
                    onChange={value =>
                      atualizarEndereco(index, {
                        principal:
                          value ?? false,
                      })
                    }
                  />

                  <Campo
                    label="CEP"
                    editando={editando}
                    value={endereco.cep}
                    formatter={maskCEP}
                    parser={parseCEP}
                    inputMode="numeric"
                    onChange={value =>
                      atualizarEndereco(index, {
                        cep: value,
                      })
                    }
                  />

                  <Campo
                    label="Logradouro"
                    editando={editando}
                    value={endereco.logradouro}
                    onChange={value =>
                      atualizarEndereco(index, {
                        logradouro: value,
                      })
                    }
                  />

                  <Campo
                    label="Número"
                    editando={editando}
                    value={endereco.numero}
                    onChange={value =>
                      atualizarEndereco(index, {
                        numero: value,
                      })
                    }
                  />

                  <Campo
                    label="Complemento"
                    editando={editando}
                    value={endereco.complemento}
                    onChange={value =>
                      atualizarEndereco(index, {
                        complemento: value,
                      })
                    }
                  />

                  <Campo
                    label="Bairro"
                    editando={editando}
                    value={endereco.bairro}
                    onChange={value =>
                      atualizarEndereco(index, {
                        bairro: value,
                      })
                    }
                  />

                  <Campo
                    label="Município"
                    editando={editando}
                    value={endereco.municipio}
                    onChange={value =>
                      atualizarEndereco(index, {
                        municipio: value,
                      })
                    }
                  />

                  <Campo
                    label="UF"
                    editando={editando}
                    value={endereco.uf}
                    onChange={value =>
                      atualizarEndereco(index, {
                        uf: value,
                      })
                    }
                  />

                  <Campo
                    label="Observação"
                    editando={editando}
                    value={endereco.observacao}
                    onChange={value =>
                      atualizarEndereco(index, {
                        observacao: value,
                      })
                    }
                  />
                </div>

                {editando && (
                  <div className="mt-3 flex justify-end">
                    <DeleteButton
                      onClick={() =>
                        removerEndereco(index)
                      }
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Section>

      {!isPF && (
        <Section title="Contatos da empresa">
          <SubHeader
            title={`${contatos.length} contato(s)`}
            editando={editando}
            onAdd={adicionarContato}
          />

          <div className="mt-3 space-y-3">
            {!contatos.length ? (
              <EmptyText text="Nenhum contato cadastrado." />
            ) : (
              contatos.map((contato, index) => (
                <div
                  key={contato.id || index}
                  className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-2 xl:grid-cols-4"
                >
                  <Campo
                    label="Nome"
                    editando={editando}
                    value={contato.nome}
                    onChange={value =>
                      atualizarContato(index, {
                        nome: value,
                      })
                    }
                  />

                  <Campo
                    label="Telefone"
                    editando={editando}
                    value={contato.telefone}
                    formatter={maskPhone}
                    parser={parsePhone}
                    inputMode="tel"
                    onChange={value =>
                      atualizarContato(index, {
                        telefone: value,
                      })
                    }
                  />

                  <Campo
                    label="E-mail"
                    editando={editando}
                    value={contato.email}
                    onChange={value =>
                      atualizarContato(index, {
                        email: value,
                      })
                    }
                  />

                  <Campo
                    label="Cargo"
                    editando={editando}
                    value={contato.cargo}
                    onChange={value =>
                      atualizarContato(index, {
                        cargo: value,
                      })
                    }
                  />

                  <Campo
                    label="Departamento"
                    editando={editando}
                    value={contato.departamento}
                    onChange={value =>
                      atualizarContato(index, {
                        departamento: value,
                      })
                    }
                  />

                  <BooleanField
                    label="Principal"
                    editando={editando}
                    value={contato.principal}
                    onChange={value =>
                      atualizarContato(index, {
                        principal:
                          value ?? false,
                      })
                    }
                  />

                  <Campo
                    label="Observação"
                    editando={editando}
                    value={contato.observacao}
                    onChange={value =>
                      atualizarContato(index, {
                        observacao: value,
                      })
                    }
                  />

                  {editando && (
                    <DeleteButton
                      onClick={() =>
                        removerContato(index)
                      }
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </Section>
      )}

      <Section title="Informações CRM">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Campo
            label="Origem"
            editando={editando}
            value={dados.origem}
            onChange={value =>
              atualizarCampo('origem', value)
            }
          />

          <Campo
            label="Canal de entrada"
            editando={editando}
            value={dados.canal_entrada}
            onChange={value =>
              atualizarCampo(
                'canal_entrada',
                value
              )
            }
          />

          <Campo
            label="Fase de atendimento"
            editando={editando}
            value={dados.fase_atendimento}
            onChange={value =>
              atualizarCampo(
                'fase_atendimento',
                value
              )
            }
          />

          <Campo
            label="Temperatura"
            editando={editando}
            value={dados.temperatura}
            onChange={value =>
              atualizarCampo(
                'temperatura',
                value
              )
            }
          />

          <Campo
            label="Tags"
            editando={editando}
            value={arrayTexto(dados.tags)}
            onChange={value =>
              atualizarCampo(
                'tags',
                parseLista(value)
              )
            }
            placeholder="VIP, Renovação, Indicação..."
          />

          
        </div>
      </Section>

      <Section
        title={
          isPF
            ? 'Empresas vinculadas'
            : 'Sócios / pessoas vinculadas'
        }
      >
        {!vinculos.length ? (
          <EmptyText
            text={
              isPF
                ? 'Nenhuma empresa vinculada.'
                : 'Nenhuma pessoa vinculada.'
            }
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            {vinculos.map((vinculo, index) => (
              <div
                key={vinculo.id}
                className={`grid gap-2 px-3 py-3 text-sm md:grid-cols-[1fr_180px_180px] ${
                  index
                    ? 'border-t border-slate-200'
                    : ''
                }`}
              >
                <div>
                  <p className="font-semibold text-slate-700">
                    {vinculo.nome}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {vinculo.documento
                      ? formatarDocumento(
                          vinculo.documento,
                          isPF ? 'PJ' : 'PF'
                        )
                      : 'Documento não informado'}
                  </p>
                </div>

                <ReadOnlyField
                  label="Papel"
                  value={vinculo.papel || '—'}
                />

                <ReadOnlyField
                  label="Origem"
                  value={vinculo.origem || '—'}
                />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Observações">
        {editando ? (
          <textarea
            value={texto(dados.observacoes)}
            onChange={event =>
              atualizarCampo(
                'observacoes',
                event.target.value
              )
            }
            rows={5}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm text-slate-600">
            {texto(dados.observacoes) ||
              'Nenhuma observação cadastrada.'}
          </p>
        )}
      </Section>

      
      
    </div>
  )
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
        <h4 className="text-xs font-bold uppercase tracking-wide">
          {title}
        </h4>
      </div>

      {children}
    </section>
  )
}

function Campo({
  label,
  value,
  visualValue,
  editando,
  onChange,
  type = 'text',
  placeholder,
  formatter,
  parser,
  inputMode,
}: {
  label: string
  value?: any
  visualValue?: ReactNode
  editando: boolean
  onChange: (value: any) => void
  type?: 'text' | 'date' | 'number'
  placeholder?: string
  formatter?: (value: any) => string
  parser?: (value: string) => any
  inputMode?:
    | 'text'
    | 'numeric'
    | 'decimal'
    | 'tel'
    | 'email'
    | 'search'
    | 'url'
}) {
  const valorExibido = formatter
    ? formatter(value)
    : texto(value)

  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      {editando ? (
        <input
          type={type}
          inputMode={inputMode}
          value={valorExibido}
          placeholder={placeholder}
          onChange={event =>
            onChange(
              parser
                ? parser(event.target.value)
                : event.target.value
            )
          }
          className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      ) : (
        <div className="mt-1 break-words text-sm font-medium text-slate-700">
          {visualValue ??
            (formatter
              ? formatter(value)
              : texto(value)) ??
            '—'}

          {!visualValue &&
            !texto(value) &&
            '—'}
        </div>
      )}
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
  value?: boolean | null
  editando: boolean
  onChange: (value: boolean | null) => void
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
              : value === false
                ? 'false'
                : ''
          }
          onChange={event => {
            if (!event.target.value) {
              onChange(null)
              return
            }

            onChange(
              event.target.value === 'true'
            )
          }}
          className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">Não informado</option>
          <option value="true">Sim</option>
          <option value="false">Não</option>
        </select>
      ) : (
        <div className="mt-1 text-sm font-medium text-slate-700">
          {formatarBoolean(value)}
        </div>
      )}
    </div>
  )
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="mt-1 break-words text-sm font-medium text-slate-700">
        {value || '—'}
      </div>
    </div>
  )
}

function SubHeader({
  title,
  editando,
  onAdd,
}: {
  title: string
  editando: boolean
  onAdd: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs font-semibold text-slate-500">
        {title}
      </p>

      {editando && (
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-100"
        >
          <Plus size={13} />
          Adicionar
        </button>
      )}
    </div>
  )
}

function DeleteButton({
  onClick,
}: {
  onClick: () => void
}) {
  return (
    <div className="flex items-end justify-end">
      <button
        type="button"
        onClick={onClick}
        title="Remover"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-500 hover:bg-rose-50"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function EmptyText({
  text,
}: {
  text: string
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-xs text-slate-400">
      {text}
    </div>
  )
}
