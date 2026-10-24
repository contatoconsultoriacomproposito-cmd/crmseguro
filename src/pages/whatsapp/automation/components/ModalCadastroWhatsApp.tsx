import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Building2,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Search,
  Trash2,
  User,
  X,
} from 'lucide-react'

import { toast } from 'sonner'

import type { WhatsAppConversation } from '../../types/whatsapp'

import {
  criarEmpresa,
  criarPessoa,
  criarVinculoPessoaEmpresa,
  obterMensagemDocumentoExistente,
  obterSessaoCrm,
  verificarCnpjExistente,
  verificarCpfExistente,
  type CrmEmpresa,
  type CrmPessoa,
  type CrmUsuarioSessao,
} from '../../services/crmClienteService'


import { supabase } from '../../../../lib/supabaseClient'

import {
  maskCEP,
  maskCNPJ,
  maskCPF,
  maskPhone,
} from '../../../../utils/masks'

import { validarCPF } from '../../../../utils/validarCPF'

import { buscarCepCrm, buscarCnpjCrm } from '../../services/crmBrasilApi'

// ============================================================
// TIPOS
// ============================================================

type TipoCliente = 'PF' | 'PJ'

interface ModalCadastroWhatsAppProps {
  open: boolean

  conversation?: WhatsAppConversation

  onClose: () => void

  onSuccess?: (
    registro: CrmPessoa | CrmEmpresa,
    tipo: TipoCliente
  ) => void
}

interface ResponsavelOpcao {
  id: string
  nome: string
  tipo_usuario: 'CORRETORA' | 'CORRETOR'
}

interface TelefoneForm {
  id: string
  numero: string
  tipo: string
  whatsapp: boolean
  principal: boolean
}

interface EmailForm {
  id: string
  email: string
  tipo: string
  principal: boolean
}

interface EnderecoForm {
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  municipio: string
  uf: string
}

interface PessoaForm {
  nome: string
  cpf: string

  data_nascimento: string
  sexo: string
  estado_civil: string
  naturalidade: string
  ocupacao: string

  rg_numero: string
  rg_orgao: string
  data_emissao_rg: string

  observacoes: string
}

interface EmpresaForm {
  cnpj: string

  razao_social: string
  nome_fantasia: string

  situacao_cadastral: string
  data_abertura: string

  porte: string
  matriz_filial: string
  natureza_juridica: string

  capital_social: string

  cnae_principal: string
  cnae_principal_descricao: string

  opcao_pelo_mei: boolean | null
  opcao_pelo_simples: boolean | null

  observacoes: string
}

interface ContatoEmpresaForm {
  id: string
  origemConversa: boolean
  vincular: boolean
  nome: string
  cpf: string
  email: string
  telefone: string
  papel: string
  data_nascimento: string
  sexo: string
  estado_civil: string
  naturalidade: string
  ocupacao: string
  observacoes: string
}

interface CnaeSecundario {
  codigo: string
  descricao: string
}

interface SocioApi {
  id: string
  nome: string
  qualificacao: string | null
  faixa_etaria: string | null
  pais: string | null
  data_entrada_sociedade: string | null
  representante_legal: string | null
  qualificacao_representante_legal: string | null
  raw: Record<string, any>
  cadastrarPessoa: boolean
  cpf: string
  email: string
  telefone: string
  data_nascimento: string
  sexo: string
  estado_civil: string
  naturalidade: string
  ocupacao: string
  observacoes: string
}

// ============================================================
// ESTADOS INICIAIS
// ============================================================

const pessoaInicial: PessoaForm = {
  nome: '',
  cpf: '',

  data_nascimento: '',
  sexo: '',
  estado_civil: '',
  naturalidade: '',
  ocupacao: '',

  rg_numero: '',
  rg_orgao: '',
  data_emissao_rg: '',

  observacoes: '',
}

const empresaInicial: EmpresaForm = {
  cnpj: '',

  razao_social: '',
  nome_fantasia: '',

  situacao_cadastral: '',
  data_abertura: '',

  porte: '',
  matriz_filial: '',
  natureza_juridica: '',

  capital_social: '',

  cnae_principal: '',
  cnae_principal_descricao: '',

  opcao_pelo_mei: null,
  opcao_pelo_simples: null,

  observacoes: '',
}

const criarContatoEmpresaInicial = (
  origemConversa = false
): ContatoEmpresaForm => ({
  id: gerarId(),
  origemConversa,
  vincular: true,
  nome: '',
  cpf: '',
  email: '',
  telefone: '',
  papel: '',
  data_nascimento: '',
  sexo: '',
  estado_civil: '',
  naturalidade: '',
  ocupacao: '',
  observacoes: '',
})

const enderecoInicial: EnderecoForm = {
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  municipio: '',
  uf: '',
}

// ============================================================
// AUXILIARES
// ============================================================

const gerarId = () => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`
}

const somenteNumeros = (
  valor?: string | null
) => {
  return String(valor || '').replace(/\D/g, '')
}

const normalizarTelefoneWhatsAppBrasil = (valor?: string | null) => {
  let numeros = somenteNumeros(valor)

  if (numeros.startsWith('55') && (numeros.length === 12 || numeros.length === 13)) {
    numeros = numeros.slice(2)
  }

  return numeros
}

const texto = (
  valor: unknown
): string => {
  if (
    valor === undefined ||
    valor === null
  ) {
    return ''
  }

  return String(valor).trim()
}

const booleanApi = (
  valor: unknown
): boolean | null => {
  if (typeof valor === 'boolean') {
    return valor
  }

  if (typeof valor === 'number') {
    return valor !== 0
  }

  if (typeof valor === 'string') {
    const normalizado = valor
      .trim()
      .toLowerCase()

    if (
      [
        'true',
        'sim',
        's',
        '1',
        'yes',
      ].includes(normalizado)
    ) {
      return true
    }

    if (
      [
        'false',
        'não',
        'nao',
        'n',
        '0',
        'no',
      ].includes(normalizado)
    ) {
      return false
    }
  }

  return null
}

const normalizarTelefoneApi = (
  telefone: unknown
) => {
  const valor = somenteNumeros(
    texto(telefone)
  )

  if (!valor) {
    return ''
  }

  return maskPhone(valor)
}

const formatarCapitalSocial = (
  valor: unknown
) => {
  if (
    valor === undefined ||
    valor === null ||
    valor === ''
  ) {
    return ''
  }

  const numero = Number(valor)

  if (!Number.isFinite(numero)) {
    return texto(valor)
  }

  return numero.toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )
}

const capitalSocialNumero = (
  valor: string
): number | null => {
  if (!valor.trim()) {
    return null
  }

  const normalizado = valor
    .replace(/\./g, '')
    .replace(',', '.')

  const numero = Number(normalizado)

  return Number.isFinite(numero)
    ? numero
    : null
}

const formatarDataApi = (
  valor: unknown
) => {
  const original = texto(valor)

  if (!original) {
    return ''
  }

  const matchBr =
    original.match(
      /^(\d{2})\/(\d{2})\/(\d{4})$/
    )

  if (matchBr) {
    return `${matchBr[3]}-${matchBr[2]}-${matchBr[1]}`
  }

  if (
    /^\d{4}-\d{2}-\d{2}/.test(
      original
    )
  ) {
    return original.slice(0, 10)
  }

  return original
}

const extrairSocios = (
  dados: Record<string, any>
): SocioApi[] => {
  if (!Array.isArray(dados?.qsa)) {
    return []
  }

  return dados.qsa
    .map((socio: any) => ({
      id: gerarId(),
      nome:
        texto(
          socio.nome_socio ||
            socio.nome
        ),

      qualificacao:
        texto(
          socio.qualificacao_socio ||
            socio.qualificacao
        ) || null,

      faixa_etaria:
        texto(
          socio.faixa_etaria
        ) || null,

      pais:
        texto(socio.pais) || null,

      data_entrada_sociedade:
        texto(
          socio.data_entrada_sociedade
        ) || null,

      representante_legal:
        texto(
          socio.nome_representante_legal
        ) || null,

      qualificacao_representante_legal:
        texto(
          socio.qualificacao_representante_legal
        ) || null,

      raw: socio,
      cadastrarPessoa: false,
      cpf: '',
      email: '',
      telefone: '',
      data_nascimento: '',
      sexo: '',
      estado_civil: '',
      naturalidade: '',
      ocupacao: '',
      observacoes: '',
    }))
    .filter(
      (socio: SocioApi) =>
        Boolean(socio.nome)
    )
}

const extrairCnaesSecundarios = (
  dados: Record<string, any>
): CnaeSecundario[] => {
  if (
    !Array.isArray(
      dados?.cnaes_secundarios
    )
  ) {
    return []
  }

  return dados.cnaes_secundarios
    .map((item: any) => ({
      codigo:
        texto(
          item.codigo ||
            item.cnae
        ),

      descricao:
        texto(
          item.descricao
        ),
    }))
    .filter(
      (item: CnaeSecundario) =>
        Boolean(item.codigo)
    )
}

// ============================================================
// COMPONENTE
// ============================================================

export default function ModalCadastroWhatsApp({
  open,
  conversation,
  onClose,
  onSuccess,
}: ModalCadastroWhatsAppProps) {
  const [tipo, setTipo] =
    useState<TipoCliente>('PF')

  const [sessao, setSessao] =
    useState<CrmUsuarioSessao | null>(
      null
    )

  const [
    responsaveis,
    setResponsaveis,
  ] = useState<ResponsavelOpcao[]>([])

  const [
    responsavelId,
    setResponsavelId,
  ] = useState('')

  const [
    pessoa,
    setPessoa,
  ] = useState<PessoaForm>(
    pessoaInicial
  )

  const [
    empresa,
    setEmpresa,
  ] = useState<EmpresaForm>(
    empresaInicial
  )

  const [contatosEmpresa, setContatosEmpresa] =
    useState<ContatoEmpresaForm[]>([])

  const [
    telefones,
    setTelefones,
  ] = useState<TelefoneForm[]>([])

  const [
    emails,
    setEmails,
  ] = useState<EmailForm[]>([])

  const [
    endereco,
    setEndereco,
  ] = useState<EnderecoForm>(
    enderecoInicial
  )

  const [
    cnaesSecundarios,
    setCnaesSecundarios,
  ] = useState<CnaeSecundario[]>([])

  const [
    sociosApi,
    setSociosApi,
  ] = useState<SocioApi[]>([])

  const [
    dadosApiCnpj,
    setDadosApiCnpj,
  ] = useState<Record<
    string,
    any
  > | null>(null)

  const [
    loadingInicial,
    setLoadingInicial,
  ] = useState(false)

  const [
    consultandoDocumento,
    setConsultandoDocumento,
  ] = useState(false)

  const [
    consultandoCnpj,
    setConsultandoCnpj,
  ] = useState(false)

  const [
    consultandoCep,
    setConsultandoCep,
  ] = useState(false)

  const [
    salvando,
    setSalvando,
  ] = useState(false)

  const [
    erroDocumento,
    setErroDocumento,
  ] = useState('')

  const [
    documentoVerificado,
    setDocumentoVerificado,
  ] = useState(false)

  // ==========================================================
  // DADOS DO WHATSAPP
  // ==========================================================

  const whatsappNome =
    conversation?.contact?.name?.trim() ||
    ''

  const whatsappTelefone =
    conversation?.contact?.phone || ''

  const whatsappContactId =
    conversation?.contact?.id || ''

  const whatsappConversationId =
    conversation?.id || ''

  // ==========================================================
  // RESET / INICIALIZAÇÃO
  // ==========================================================

  useEffect(() => {
    if (!open) {
      return
    }

    setTipo('PF')

    setPessoa({
      ...pessoaInicial,
      nome: whatsappNome,
    })

    setEmpresa(
      empresaInicial
    )

    const numeroWhatsApp =
      whatsappTelefone
        ? maskPhone(
            normalizarTelefoneWhatsAppBrasil(whatsappTelefone)
          )
        : ''

    setContatosEmpresa([
      {
        ...criarContatoEmpresaInicial(true),
        nome: whatsappNome,
        telefone: numeroWhatsApp,
      },
    ])

    setTelefones(
      numeroWhatsApp
        ? [
            {
              id: gerarId(),
              numero:
                numeroWhatsApp,
              tipo: 'CELULAR',
              whatsapp: true,
              principal: true,
            },
          ]
        : []
    )

    setEmails([])
    setEndereco(enderecoInicial)

    setCnaesSecundarios([])
    setSociosApi([])
    setDadosApiCnpj(null)

    setErroDocumento('')
    setDocumentoVerificado(false)

    void carregarSessao()
  }, [
    open,
    whatsappNome,
    whatsappTelefone,
  ])

  // ==========================================================
  // SESSÃO / RESPONSÁVEL
  // ==========================================================

  const carregarSessao =
    async () => {
      try {
        setLoadingInicial(true)

        const sessaoAtual =
          await obterSessaoCrm()

        setSessao(sessaoAtual)

        if (
          sessaoAtual.tipo_usuario ===
          'CORRETOR'
        ) {
          setResponsavelId(
            sessaoAtual.id
          )

          setResponsaveis([])

          return
        }

        const {
          data,
          error,
        } = await supabase
          .from(
            'usuarios_perfis'
          )
          .select(`
            id,
            nome,
            tipo_usuario
          `)
          .eq(
            'corretora_id',
            sessaoAtual.corretora_id
          )
          .eq('ativo', true)
          .in(
            'tipo_usuario',
            [
              'CORRETORA',
              'CORRETOR',
            ]
          )
          .order('nome')

        if (error) {
          throw error
        }

        const lista =
          (data ||
            []) as ResponsavelOpcao[]

        setResponsaveis(lista)

        const proprioUsuario =
          lista.find(
            item =>
              item.id ===
              sessaoAtual.id
          )

        setResponsavelId(
          proprioUsuario?.id ||
            lista[0]?.id ||
            ''
        )
      } catch (error) {
        console.error(
          'Erro ao carregar sessão:',
          error
        )

        toast.error(
          'Não foi possível carregar os responsáveis.'
        )
      } finally {
        setLoadingInicial(false)
      }
    }

  // ==========================================================
  // TROCA PF / PJ
  // ==========================================================

  const alterarTipo = (
    novoTipo: TipoCliente
  ) => {
    setTipo(novoTipo)

    setErroDocumento('')
    setDocumentoVerificado(false)

    setDadosApiCnpj(null)
    setSociosApi([])
    setCnaesSecundarios([])

    if (
      novoTipo === 'PF' &&
      !pessoa.nome
    ) {
      setPessoa(current => ({
        ...current,
        nome: whatsappNome,
      }))
    }
  }

  // ==========================================================
  // CPF
  // ==========================================================

  const handleCpfChange = (
    value: string
  ) => {
    const mascarado =
      maskCPF(value)

    setPessoa(current => ({
      ...current,
      cpf: mascarado,
    }))

    setErroDocumento('')
    setDocumentoVerificado(false)
  }

  const verificarCpf =
    async () => {
      const cpfLimpo =
        somenteNumeros(
          pessoa.cpf
        )

      setErroDocumento('')
      setDocumentoVerificado(false)

      if (!cpfLimpo) {
        setErroDocumento(
          'Informe o CPF.'
        )
        return false
      }

      if (
        cpfLimpo.length !== 11
      ) {
        setErroDocumento(
          'CPF incompleto.'
        )
        return false
      }

      if (!validarCPF(cpfLimpo)) {
        setErroDocumento(
          'CPF inválido.'
        )
        return false
      }

      try {
        setConsultandoDocumento(
          true
        )

        const resultado =
          await verificarCpfExistente(
            cpfLimpo
          )

        const mensagem =
          obterMensagemDocumentoExistente(
            resultado,
            'CPF'
          )

        if (mensagem) {
          setErroDocumento(
            mensagem
          )

          return false
        }

        setDocumentoVerificado(
          true
        )

        return true
      } catch (error) {
        console.error(
          'Erro ao verificar CPF:',
          error
        )

        setErroDocumento(
          'Não foi possível verificar o CPF.'
        )

        return false
      } finally {
        setConsultandoDocumento(
          false
        )
      }
    }

  // ==========================================================
  // CNPJ
  // ==========================================================

  const handleCnpjChange = (
    value: string
  ) => {
    setEmpresa(current => ({
      ...current,
      cnpj: maskCNPJ(value),
    }))

    setErroDocumento('')
    setDocumentoVerificado(false)

    setDadosApiCnpj(null)
    setSociosApi([])
    setCnaesSecundarios([])
  }

  const consultarCnpj =
    async () => {
      const cnpjLimpo =
        somenteNumeros(
          empresa.cnpj
        )

      setErroDocumento('')
      setDocumentoVerificado(false)

      if (
        cnpjLimpo.length !== 14
      ) {
        setErroDocumento(
          'Informe um CNPJ válido com 14 dígitos.'
        )
        return
      }

      try {
        setConsultandoCnpj(true)
        setConsultandoDocumento(true)

        // PRIMEIRO:
        // verifica toda a corretora
        const duplicidade =
          await verificarCnpjExistente(
            cnpjLimpo
          )

        const mensagem =
          obterMensagemDocumentoExistente(
            duplicidade,
            'CNPJ'
          )

        if (mensagem) {
          setErroDocumento(
            mensagem
          )
          return
        }

        setDocumentoVerificado(
          true
        )

        setConsultandoDocumento(
          false
        )

        // SOMENTE DEPOIS:
        // consulta API externa
        const consultaCnpj = await buscarCnpjCrm(cnpjLimpo)

        const raw = consultaCnpj.dados_api_cnpj

        // ----------------------------------------------
        // PRESERVA 100% DA RESPOSTA
        // ----------------------------------------------

        setDadosApiCnpj(raw)

        // ----------------------------------------------
        // DADOS OPERACIONAIS
        // ----------------------------------------------

        setEmpresa(current => ({
          ...current,

          cnpj:
            maskCNPJ(cnpjLimpo),

          razao_social:
            texto(
              raw.razao_social
            ),

          nome_fantasia:
            texto(
              raw.nome_fantasia
            ),

          situacao_cadastral:
            texto(
              raw.descricao_situacao_cadastral ||
                raw.situacao_cadastral
            ),

          data_abertura:
            formatarDataApi(
              raw.data_inicio_atividade
            ),

          porte:
            texto(
              raw.porte ||
                raw.descricao_porte
            ),

          matriz_filial:
            texto(
              raw.descricao_identificador_matriz_filial ||
                raw.descricao_matriz_filial ||
                raw.matriz_filial
            ),

          natureza_juridica:
            texto(
              raw.natureza_juridica
            ),

          capital_social:
            formatarCapitalSocial(
              raw.capital_social
            ),

          cnae_principal:
            texto(
              raw.cnae_fiscal
            ),

          cnae_principal_descricao:
            texto(
              raw.cnae_fiscal_descricao
            ),

          opcao_pelo_mei:
            booleanApi(
              raw.opcao_pelo_mei
            ),

          opcao_pelo_simples:
            booleanApi(
              raw.opcao_pelo_simples
            ),
        }))

        setCnaesSecundarios(
          extrairCnaesSecundarios(
            raw
          )
        )

        setSociosApi(
          extrairSocios(raw)
        )

        // ----------------------------------------------
        // ENDEREÇO
        // ----------------------------------------------

        setEndereco({
          cep:
            raw.cep
              ? maskCEP(
                  somenteNumeros(
                    raw.cep
                  )
                )
              : '',

          logradouro:
            texto(
              raw.logradouro
            ),

          numero:
            texto(raw.numero),

          complemento:
            texto(
              raw.complemento
            ),

          bairro:
            texto(raw.bairro),

          municipio:
            texto(
              raw.municipio
            ),

          uf:
            texto(raw.uf)
              .toUpperCase(),
        })

        // ----------------------------------------------
        // TELEFONES
        // WhatsApp original nunca é removido
        // ----------------------------------------------

        setTelefones(current => {
          const lista = [
            ...current,
          ]

          const candidatos = [
            raw.ddd_telefone_1,
            raw.ddd_telefone_2,
          ]

          candidatos.forEach(
            candidato => {
              const numero =
                normalizarTelefoneApi(
                  candidato
                )

              if (!numero) {
                return
              }

              const numeroLimpo =
                somenteNumeros(
                  numero
                )

              const existe =
                lista.some(
                  item =>
                    somenteNumeros(
                      item.numero
                    ) ===
                    numeroLimpo
                )

              if (!existe) {
                lista.push({
                  id: gerarId(),
                  numero,
                  tipo:
                    'COMERCIAL',
                  whatsapp: false,
                  principal:
                    lista.length ===
                    0,
                })
              }
            }
          )

          return lista
        })

        // ----------------------------------------------
        // E-MAIL
        // ----------------------------------------------

        if (texto(raw.email)) {
          setEmails(current => {
            const emailApi =
              texto(
                raw.email
              ).toLowerCase()

            if (
              current.some(
                item =>
                  item.email
                    .trim()
                    .toLowerCase() ===
                  emailApi
              )
            ) {
              return current
            }

            return [
              ...current,
              {
                id: gerarId(),
                email:
                  emailApi,
                tipo:
                  'COMERCIAL',
                principal:
                  current.length ===
                  0,
              },
            ]
          })
        }

        toast.success(
          'Dados do CNPJ carregados com sucesso.'
        )
      } catch (error) {
        console.error(
          'Erro ao consultar CNPJ:',
          error
        )

        toast.error(
          error instanceof Error
            ? error.message
            : 'Não foi possível consultar o CNPJ.'
        )
      } finally {
        setConsultandoCnpj(false)
        setConsultandoDocumento(
          false
        )
      }
    }

  // ==========================================================
  // CEP
  // ==========================================================

  const handleCepChange =
    async (
      value: string
    ) => {
      const cepMascarado =
        maskCEP(value)

      setEndereco(current => ({
        ...current,
        cep: cepMascarado,
      }))

      const cepLimpo =
        somenteNumeros(
          cepMascarado
        )

      if (
        cepLimpo.length !== 8
      ) {
        return
      }

      try {
        setConsultandoCep(true)

        const resultado =
          await buscarCepCrm(cepLimpo)

        if (!resultado) {
          return
        }

        setEndereco(current => ({
          ...current,
          cep: cepMascarado,
          logradouro: texto(resultado.logradouro),
          bairro: texto(resultado.bairro),
          municipio: texto(resultado.municipio),
          uf: texto(resultado.uf).toUpperCase(),
        }))
      } catch (error) {
        console.error(
          'Erro ao consultar CEP:',
          error
        )

        toast.error(
          'Não foi possível consultar o CEP.'
        )
      } finally {
        setConsultandoCep(false)
      }
    }

  // ==========================================================
  // TELEFONES
  // ==========================================================

  const adicionarTelefone =
    () => {
      setTelefones(current => [
        ...current,
        {
          id: gerarId(),
          numero: '',
          tipo: 'CELULAR',
          whatsapp: false,
          principal:
            current.length === 0,
        },
      ])
    }

  const atualizarTelefone = (
    id: string,
    campo:
      | 'numero'
      | 'tipo'
      | 'whatsapp'
      | 'principal',
    valor:
      | string
      | boolean
  ) => {
    setTelefones(current =>
      current.map(item => {
        if (item.id !== id) {
          if (
            campo ===
              'principal' &&
            valor === true
          ) {
            return {
              ...item,
              principal: false,
            }
          }

          return item
        }

        return {
          ...item,

          [campo]:
            campo ===
            'numero'
              ? maskPhone(
                  String(valor)
                )
              : valor,
        }
      })
    )
  }

  const removerTelefone = (
    id: string
  ) => {
    setTelefones(current =>
      current.filter(
        item => item.id !== id
      )
    )
  }

  // ==========================================================
  // EMAILS
  // ==========================================================

  const adicionarEmail = () => {
    setEmails(current => [
      ...current,
      {
        id: gerarId(),
        email: '',
        tipo: 'PESSOAL',
        principal:
          current.length === 0,
      },
    ])
  }

  const atualizarEmail = (
    id: string,
    campo:
      | 'email'
      | 'tipo'
      | 'principal',
    valor:
      | string
      | boolean
  ) => {
    setEmails(current =>
      current.map(item => {
        if (item.id !== id) {
          if (
            campo ===
              'principal' &&
            valor === true
          ) {
            return {
              ...item,
              principal: false,
            }
          }

          return item
        }

        return {
          ...item,
          [campo]: valor,
        }
      })
    )
  }

  const removerEmail = (
    id: string
  ) => {
    setEmails(current =>
      current.filter(
        item => item.id !== id
      )
    )
  }

  // ==========================================================
  // CONTATOS DA EMPRESA / QSA
  // ==========================================================

  const adicionarContatoEmpresa = () => {
    setContatosEmpresa(current => [
      ...current,
      criarContatoEmpresaInicial(false),
    ])
  }

  const atualizarContatoEmpresa = <K extends keyof ContatoEmpresaForm>(
    id: string,
    campo: K,
    valor: ContatoEmpresaForm[K]
  ) => {
    setContatosEmpresa(current =>
      current.map(contato =>
        contato.id === id
          ? { ...contato, [campo]: valor }
          : contato
      )
    )
  }

  const removerContatoEmpresa = (id: string) => {
    setContatosEmpresa(current =>
      current.filter(contato => contato.id !== id)
    )
  }

  const atualizarSocio = <K extends keyof SocioApi>(
    id: string,
    campo: K,
    valor: SocioApi[K]
  ) => {
    setSociosApi(current =>
      current.map(socio =>
        socio.id === id
          ? { ...socio, [campo]: valor }
          : socio
      )
    )
  }

  const validarPessoaRelacionada = async (
    nome: string,
    cpfInformado: string,
    descricao: string
  ) => {
    if (!nome.trim()) {
      throw new Error(`Informe o nome ${descricao}.`)
    }

    const cpf = somenteNumeros(cpfInformado)

    if (!cpf) return null

    if (cpf.length !== 11 || !validarCPF(cpf)) {
      throw new Error(`O CPF ${descricao} é inválido.`)
    }

    const duplicidade = await verificarCpfExistente(cpf)
    const mensagem = obterMensagemDocumentoExistente(duplicidade, 'CPF')

    if (mensagem) {
      throw new Error(mensagem)
    }

    return cpf
  }

  // ==========================================================
  // VALIDAÇÃO
  // ==========================================================

  const validarFormulario =
    async () => {
      if (!responsavelId) {
        toast.error(
          'Informe o responsável pelo cliente.'
        )
        return false
      }

      if (tipo === 'PF') {
        if (!pessoa.nome.trim()) {
          toast.error(
            'Informe o nome da pessoa.'
          )
          return false
        }

        const cpf =
          somenteNumeros(
            pessoa.cpf
          )

        if (!cpf) {
          toast.error(
            'Informe o CPF.'
          )
          return false
        }

        if (
          cpf.length !== 11 ||
          !validarCPF(cpf)
        ) {
          toast.error(
            'Informe um CPF válido.'
          )
          return false
        }

        if (
          !documentoVerificado
        ) {
          return await verificarCpf()
        }

        return true
      }

      const cnpj =
        somenteNumeros(
          empresa.cnpj
        )

      if (
        cnpj.length !== 14
      ) {
        toast.error(
          'Informe um CNPJ válido.'
        )
        return false
      }

      if (
        !empresa.razao_social.trim()
      ) {
        toast.error(
          'Informe a razão social.'
        )
        return false
      }

      if (
        !documentoVerificado
      ) {
        const resultado =
          await verificarCnpjExistente(
            cnpj
          )

        const mensagem =
          obterMensagemDocumentoExistente(
            resultado,
            'CNPJ'
          )

        if (mensagem) {
          setErroDocumento(
            mensagem
          )
          return false
        }

        setDocumentoVerificado(
          true
        )
      }

      return true
    }

  // ==========================================================
  // SALVAR
  // ==========================================================

  const salvar = async () => {
    if (salvando) {
      return
    }

    const valido =
      await validarFormulario()

    if (!valido) {
      return
    }

    try {
      setSalvando(true)

      const telefonesValidos =
        telefones
          .filter(item =>
            Boolean(
              somenteNumeros(
                item.numero
              )
            )
          )
          .map(item => ({
            id: item.id,

            numero:
              item.numero,

            tipo:
              item.tipo ||
              null,

            whatsapp:
              item.whatsapp,

            principal:
              item.principal,
          }))

      const emailsValidos =
        emails
          .filter(item =>
            Boolean(
              item.email.trim()
            )
          )
          .map(item => ({
            id: item.id,

            email:
              item.email
                .trim()
                .toLowerCase(),

            tipo:
              item.tipo ||
              null,

            principal:
              item.principal,
          }))

      const enderecoExiste =
        Boolean(
          somenteNumeros(
            endereco.cep
          ) ||
            endereco.logradouro ||
            endereco.municipio ||
            endereco.uf
        )

      const enderecos =
        enderecoExiste
          ? [
              {
                id: gerarId(),

                tipo:
                  tipo === 'PF'
                    ? 'RESIDENCIAL'
                    : 'COMERCIAL',

                principal: true,

                cep:
                  endereco.cep,

                logradouro:
                  endereco.logradouro,

                numero:
                  endereco.numero,

                complemento:
                  endereco.complemento,

                bairro:
                  endereco.bairro,

                municipio:
                  endereco.municipio,

                uf:
                  endereco.uf,
              },
            ]
          : []

      if (tipo === 'PF') {
        const registro =
          await criarPessoa({
            corretor_id:
              responsavelId,

            cpf:
              somenteNumeros(
                pessoa.cpf
              ),

            classificacao:
              'NAO_QUALIFICADO',

            dados: {
              nome:
                pessoa.nome,

              modo_cadastro:
                'COMPLETO',

              data_nascimento:
                pessoa.data_nascimento ||
                null,

              sexo:
                pessoa.sexo ||
                null,

              estado_civil:
                pessoa.estado_civil ||
                null,

              naturalidade:
                pessoa.naturalidade ||
                null,

              ocupacao:
                pessoa.ocupacao ||
                null,

              documentos: {
                rg_numero:
                  pessoa.rg_numero ||
                  null,

                rg_orgao:
                  pessoa.rg_orgao ||
                  null,

                data_emissao_rg:
                  pessoa.data_emissao_rg ||
                  null,
              },

              telefones:
                telefonesValidos,

              emails:
                emailsValidos,

              enderecos,

              origem:
                'WHATSAPP',

              canal_entrada:
                'WHATSAPP',

              observacoes:
                pessoa.observacoes ||
                null,

              campos_adicionais: {
                whatsapp: {
                  contato_id:
                    whatsappContactId ||
                    null,

                  conversa_id:
                    whatsappConversationId ||
                    null,

                  nome_original:
                    whatsappNome ||
                    null,

                  telefone_original:
                    whatsappTelefone ||
                    null,
                },
              },
            },
          })

        toast.success(
          'Pessoa cadastrada com sucesso.'
        )

        onSuccess?.(
          registro,
          'PF'
        )

        onClose()

        return
      }

      const registro =
        await criarEmpresa({
          corretor_id:
            responsavelId,

          cnpj:
            somenteNumeros(
              empresa.cnpj
            ),

          classificacao:
            'NAO_QUALIFICADO',

          dados_api_cnpj:
            dadosApiCnpj || {},

          dados: {
            razao_social:
              empresa.razao_social,

            nome_fantasia:
              empresa.nome_fantasia ||
              null,

            modo_cadastro:
              'COMPLETO',

            situacao_cadastral:
              empresa.situacao_cadastral ||
              null,

            data_abertura:
              empresa.data_abertura ||
              null,

            porte:
              empresa.porte ||
              null,

            matriz_filial:
              empresa.matriz_filial ||
              null,

            natureza_juridica:
              empresa.natureza_juridica ||
              null,

            capital_social:
              capitalSocialNumero(
                empresa.capital_social
              ),

            cnae_principal:
              empresa.cnae_principal ||
              null,

            cnae_principal_descricao:
              empresa.cnae_principal_descricao ||
              null,

            cnaes_secundarios:
              cnaesSecundarios.map(
                item => ({
                  codigo:
                    item.codigo,

                  descricao:
                    item.descricao ||
                    null,

                  principal:
                    false,
                })
              ),

            opcao_pelo_mei:
              empresa.opcao_pelo_mei,

            opcao_pelo_simples:
              empresa.opcao_pelo_simples,

            telefones:
              telefonesValidos,

            emails:
              emailsValidos,

            enderecos,

            contatos: [],

            origem:
              'WHATSAPP',

            canal_entrada:
              'WHATSAPP',

            observacoes:
              empresa.observacoes ||
              null,

            campos_adicionais: {
              whatsapp: {
                contato_id:
                  whatsappContactId ||
                  null,

                conversa_id:
                  whatsappConversationId ||
                  null,

                nome_original:
                  whatsappNome ||
                  null,

                telefone_original:
                  whatsappTelefone ||
                  null,
              },

              qsa_resumo:
                sociosApi.map(
                  socio => ({
                    nome:
                      socio.nome,

                    qualificacao:
                      socio.qualificacao,

                    faixa_etaria:
                      socio.faixa_etaria,

                    pais:
                      socio.pais,

                    data_entrada_sociedade:
                      socio.data_entrada_sociedade,

                    representante_legal:
                      socio.representante_legal,

                    qualificacao_representante_legal:
                      socio.qualificacao_representante_legal,
                  })
                ),
            },
          },
        })

      const contatosParaCadastrar = contatosEmpresa.filter(
        contato => contato.vincular
      )

      for (const contato of contatosParaCadastrar) {
        const cpfContato = await validarPessoaRelacionada(
          contato.nome,
          contato.cpf,
          'da pessoa de contato da empresa'
        )

        const pessoaContato = await criarPessoa({
          corretor_id: responsavelId,
          cpf: cpfContato,
          classificacao: 'NAO_QUALIFICADO',
          dados: {
            nome: contato.nome.trim(),
            modo_cadastro: 'COMPLETO',
            data_nascimento: contato.data_nascimento || null,
            sexo: contato.sexo || null,
            estado_civil: contato.estado_civil || null,
            naturalidade: contato.naturalidade || null,
            ocupacao: contato.ocupacao || null,
            telefones: contato.telefone.trim()
              ? [{
                  id: gerarId(),
                  numero: contato.telefone,
                  tipo: 'CELULAR',
                  whatsapp: contato.origemConversa,
                  principal: true,
                }]
              : [],
            emails: contato.email.trim()
              ? [{
                  id: gerarId(),
                  email: contato.email.trim().toLowerCase(),
                  tipo: 'PESSOAL',
                  principal: true,
                }]
              : [],
            enderecos: [],
            origem: 'WHATSAPP',
            canal_entrada: 'WHATSAPP',
            observacoes: contato.observacoes || null,
            campos_adicionais: contato.origemConversa
              ? {
                  whatsapp: {
                    contato_id: whatsappContactId || null,
                    conversa_id: whatsappConversationId || null,
                    nome_original: whatsappNome || null,
                    telefone_original: whatsappTelefone || null,
                  },
                }
              : {},
          },
        })

        await criarVinculoPessoaEmpresa({
          pessoa_id: pessoaContato.id,
          empresa_id: registro.id,
          papel: contato.papel.trim() || null,
          origem_vinculo: contato.origemConversa
            ? 'WHATSAPP'
            : 'CADASTRO_MANUAL',
        })
      }

      const sociosParaCadastrar = sociosApi.filter(
        socio => socio.cadastrarPessoa
      )

      for (const socio of sociosParaCadastrar) {
        const cpfSocio = await validarPessoaRelacionada(
          socio.nome,
          socio.cpf,
          'do sócio'
        )

        const pessoaSocio = await criarPessoa({
          corretor_id: responsavelId,
          cpf: cpfSocio,
          classificacao: 'NAO_QUALIFICADO',
          dados: {
            nome: socio.nome.trim(),
            modo_cadastro: 'COMPLETO',
            data_nascimento: socio.data_nascimento || null,
            sexo: socio.sexo || null,
            estado_civil: socio.estado_civil || null,
            naturalidade: socio.naturalidade || null,
            ocupacao: socio.ocupacao || null,
            telefones: socio.telefone.trim()
              ? [{
                  id: gerarId(),
                  numero: socio.telefone,
                  tipo: 'CELULAR',
                  whatsapp: false,
                  principal: true,
                }]
              : [],
            emails: socio.email.trim()
              ? [{
                  id: gerarId(),
                  email: socio.email.trim().toLowerCase(),
                  tipo: 'PESSOAL',
                  principal: true,
                }]
              : [],
            enderecos: [],
            origem: 'QSA',
            canal_entrada: 'CADASTRO_EMPRESA',
            observacoes: socio.observacoes || null,
            campos_adicionais: {
              qsa: {
                faixa_etaria: socio.faixa_etaria,
                pais: socio.pais,
                data_entrada_sociedade: socio.data_entrada_sociedade,
                representante_legal: socio.representante_legal,
                qualificacao_representante_legal:
                  socio.qualificacao_representante_legal,
              },
            },
          },
        })

        await criarVinculoPessoaEmpresa({
          pessoa_id: pessoaSocio.id,
          empresa_id: registro.id,
          papel: socio.qualificacao || 'SÓCIO',
          origem_vinculo: 'QSA',
        })
      }

      toast.success(
        contatosParaCadastrar.length > 0 || sociosParaCadastrar.length > 0
          ? 'Empresa e pessoas vinculadas cadastradas com sucesso.'
          : 'Empresa cadastrada com sucesso.'
      )

      onSuccess?.(
        registro,
        'PJ'
      )

      onClose()
    } catch (error) {
      console.error(
        'Erro ao cadastrar cliente:',
        error
      )

      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível cadastrar o cliente.'
      )
    } finally {
      setSalvando(false)
    }
  }

  // ==========================================================
  // RESUMOS
  // ==========================================================

  const quantidadeDadosApi =
    useMemo(() => {
      if (!dadosApiCnpj) {
        return 0
      }

      return Object.keys(
        dadosApiCnpj
      ).length
    }, [dadosApiCnpj])

  if (!open) {
    return null
  }

  // ==========================================================
  // JSX
  // ==========================================================

  return (
    <div className="fixed inset-0 z-[100] flex items-stretch justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-slate-50 shadow-2xl sm:h-auto sm:max-h-[94vh] sm:max-w-6xl sm:rounded-3xl sm:border sm:border-white/70">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Cadastrar cliente
            </h2>

            <p className="mt-0.5 text-sm text-slate-500">
              Cadastro a partir da conversa do WhatsApp
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Phone size={19} />
              </div>

              <div className="min-w-0">
                <p className="font-medium text-slate-900">
                  {whatsappNome || 'Contato WhatsApp'}
                </p>

                <p className="text-sm text-slate-500">
                  {whatsappTelefone || 'Telefone não informado'}
                </p>
              </div>

              <span className="ml-auto rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                Origem: WhatsApp
              </span>
            </div>
          </div>

          <div className="mx-auto w-full max-w-6xl space-y-5 p-3 sm:p-6">
            <Section title="Tipo de cliente">
              <div className="grid grid-cols-2 gap-3">
                <TipoButton
                  active={tipo === 'PF'}
                  icon={<User size={18} />}
                  title="Pessoa Física"
                  description="CPF"
                  onClick={() =>
                    alterarTipo('PF')
                  }
                />

                <TipoButton
                  active={tipo === 'PJ'}
                  icon={<Building2 size={18} />}
                  title="Pessoa Jurídica"
                  description="CNPJ"
                  onClick={() =>
                    alterarTipo('PJ')
                  }
                />
              </div>
            </Section>

            {sessao?.tipo_usuario ===
              'CORRETORA' && (
              <Section title="Responsável">
                <Field label="Corretor responsável">
                  <select
                    value={responsavelId}
                    onChange={event =>
                      setResponsavelId(
                        event.target.value
                      )
                    }
                    disabled={loadingInicial}
                    className={inputClass}
                  >
                    <option value="">
                      Selecione
                    </option>

                    {responsaveis.map(
                      responsavel => (
                        <option
                          key={responsavel.id}
                          value={responsavel.id}
                        >
                          {responsavel.nome}
                        </option>
                      )
                    )}
                  </select>
                </Field>
              </Section>
            )}

            {tipo === 'PF' ? (
              <>
                <Section title="Identificação">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Nome completo *">
                      <input
                        value={pessoa.nome}
                        onChange={event =>
                          setPessoa(
                            current => ({
                              ...current,
                              nome:
                                event.target.value,
                            })
                          )
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="CPF *">
                      <div className="flex gap-2">
                        <input
                          value={pessoa.cpf}
                          onChange={event =>
                            handleCpfChange(
                              event.target.value
                            )
                          }
                          onBlur={() => {
                            if (
                              somenteNumeros(
                                pessoa.cpf
                              ).length === 11
                            ) {
                              void verificarCpf()
                            }
                          }}
                          className={inputClass}
                          placeholder="000.000.000-00"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            void verificarCpf()
                          }
                          disabled={
                            consultandoDocumento
                          }
                          className={searchButtonClass}
                        >
                          {consultandoDocumento ? (
                            <Loader2
                              size={17}
                              className="animate-spin"
                            />
                          ) : (
                            <Search size={17} />
                          )}
                        </button>
                      </div>

                      <DocumentoStatus
                        erro={erroDocumento}
                        verificado={
                          documentoVerificado
                        }
                      />
                    </Field>

                    <Field label="Data de nascimento">
                      <input
                        type="date"
                        value={
                          pessoa.data_nascimento
                        }
                        onChange={event =>
                          setPessoa(
                            current => ({
                              ...current,
                              data_nascimento:
                                event.target.value,
                            })
                          )
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Sexo">
                      <select
                        value={pessoa.sexo}
                        onChange={event =>
                          setPessoa(
                            current => ({
                              ...current,
                              sexo:
                                event.target.value,
                            })
                          )
                        }
                        className={inputClass}
                      >
                        <option value="">
                          Selecione
                        </option>
                        <option value="MASCULINO">
                          Masculino
                        </option>
                        <option value="FEMININO">
                          Feminino
                        </option>
                        <option value="OUTRO">
                          Outro
                        </option>
                      </select>
                    </Field>

                    <Field label="Estado civil">
                      <input
                        value={
                          pessoa.estado_civil
                        }
                        onChange={event =>
                          setPessoa(
                            current => ({
                              ...current,
                              estado_civil:
                                event.target.value,
                            })
                          )
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Ocupação">
                      <input
                        value={
                          pessoa.ocupacao
                        }
                        onChange={event =>
                          setPessoa(
                            current => ({
                              ...current,
                              ocupacao:
                                event.target.value,
                            })
                          )
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Naturalidade">
                      <input
                        value={
                          pessoa.naturalidade
                        }
                        onChange={event =>
                          setPessoa(
                            current => ({
                              ...current,
                              naturalidade:
                                event.target.value,
                            })
                          )
                        }
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </Section>

                <Section title="Documentos complementares">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="RG">
                      <input
                        value={
                          pessoa.rg_numero
                        }
                        onChange={event =>
                          setPessoa(
                            current => ({
                              ...current,
                              rg_numero:
                                event.target.value,
                            })
                          )
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Órgão emissor">
                      <input
                        value={
                          pessoa.rg_orgao
                        }
                        onChange={event =>
                          setPessoa(
                            current => ({
                              ...current,
                              rg_orgao:
                                event.target.value,
                            })
                          )
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Data de emissão">
                      <input
                        type="date"
                        value={
                          pessoa.data_emissao_rg
                        }
                        onChange={event =>
                          setPessoa(
                            current => ({
                              ...current,
                              data_emissao_rg:
                                event.target.value,
                            })
                          )
                        }
                        className={inputClass}
                      />
                    </Field>
                  </div>
                </Section>
              </>
            ) : (
              <>
                <Section title="Consulta empresarial">
                  <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                    <Field label="CNPJ *">
                      <input
                        value={empresa.cnpj}
                        onChange={event =>
                          handleCnpjChange(
                            event.target.value
                          )
                        }
                        className={inputClass}
                        placeholder="00.000.000/0000-00"
                      />

                      <DocumentoStatus
                        erro={erroDocumento}
                        verificado={
                          documentoVerificado
                        }
                      />
                    </Field>

                    <div className="flex items-start pt-[22px]">
                      <button
                        type="button"
                        onClick={() =>
                          void consultarCnpj()
                        }
                        disabled={
                          consultandoCnpj
                        }
                        className="flex h-[42px] items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
                      >
                        {consultandoCnpj ? (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                        ) : (
                          <Search size={16} />
                        )}

                        Consultar CNPJ
                      </button>
                    </div>
                  </div>

                  {dadosApiCnpj && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle2
                          size={17}
                          className="mt-0.5 shrink-0 text-emerald-600"
                        />

                        <div>
                          <p className="text-sm font-medium text-emerald-800">
                            Consulta realizada
                          </p>

                          <p className="mt-0.5 text-xs text-emerald-700">
                            O retorno integral da API será armazenado.
                            Foram recebidas {quantidadeDadosApi} propriedades
                            principais, além das estruturas internas da
                            resposta.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </Section>

                <Section title="Dados da empresa">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Razão social *">
                      <input
                        value={
                          empresa.razao_social
                        }
                        onChange={event =>
                          setEmpresa(
                            current => ({
                              ...current,
                              razao_social:
                                event.target.value,
                            })
                          )
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Nome fantasia">
                      <input
                        value={
                          empresa.nome_fantasia
                        }
                        onChange={event =>
                          setEmpresa(
                            current => ({
                              ...current,
                              nome_fantasia:
                                event.target.value,
                            })
                          )
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Situação cadastral">
                      <input
                        value={
                          empresa.situacao_cadastral
                        }
                        onChange={event =>
                          setEmpresa(
                            current => ({
                              ...current,
                              situacao_cadastral:
                                event.target.value,
                            })
                          )
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Data de abertura">
                      <input
                        type="date"
                        value={
                          empresa.data_abertura
                        }
                        onChange={event =>
                          setEmpresa(
                            current => ({
                              ...current,
                              data_abertura:
                                event.target.value,
                            })
                          )
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Porte">
                      <input
                        value={empresa.porte}
                        onChange={event =>
                          setEmpresa(
                            current => ({
                              ...current,
                              porte:
                                event.target.value,
                            })
                          )
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Matriz / Filial">
                      <input
                        value={
                          empresa.matriz_filial
                        }
                        onChange={event =>
                          setEmpresa(
                            current => ({
                              ...current,
                              matriz_filial:
                                event.target.value,
                            })
                          )
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Natureza jurídica">
                      <input
                        value={
                          empresa.natureza_juridica
                        }
                        onChange={event =>
                          setEmpresa(
                            current => ({
                              ...current,
                              natureza_juridica:
                                event.target.value,
                            })
                          )
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Capital social">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                          R$
                        </span>

                        <input
                          value={
                            empresa.capital_social
                          }
                          onChange={event =>
                            setEmpresa(
                              current => ({
                                ...current,
                                capital_social:
                                  event.target.value,
                              })
                            )
                          }
                          className={`${inputClass} pl-10`}
                        />
                      </div>
                    </Field>

                    <Field label="CNAE principal">
                      <input
                        value={
                          empresa.cnae_principal
                        }
                        onChange={event =>
                          setEmpresa(
                            current => ({
                              ...current,
                              cnae_principal:
                                event.target.value,
                            })
                          )
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Descrição CNAE">
                      <input
                        value={
                          empresa.cnae_principal_descricao
                        }
                        onChange={event =>
                          setEmpresa(
                            current => ({
                              ...current,
                              cnae_principal_descricao:
                                event.target.value,
                            })
                          )
                        }
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <BooleanBadge
                      label="Simples Nacional"
                      value={
                        empresa.opcao_pelo_simples
                      }
                    />

                    <BooleanBadge
                      label="MEI"
                      value={
                        empresa.opcao_pelo_mei
                      }
                    />
                  </div>
                </Section>

                <Section
                  title={`Contatos da empresa (${contatosEmpresa.length})`}
                  actionLabel="Adicionar contato"
                  onAction={adicionarContatoEmpresa}
                >
                  <div className="space-y-4">
                    {contatosEmpresa.map((contato, index) => (
                      <div
                        key={contato.id}
                        className={`rounded-2xl border p-4 ${
                          contato.origemConversa
                            ? 'border-blue-200 bg-blue-50/50'
                            : 'border-slate-200 bg-slate-50/60'
                        }`}
                      >
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <label className="flex cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              checked={contato.vincular}
                              onChange={event =>
                                atualizarContatoEmpresa(
                                  contato.id,
                                  'vincular',
                                  event.target.checked
                                )
                              }
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                            />
                            <div>
                              <p className="text-sm font-semibold text-slate-800">
                                {contato.origemConversa
                                  ? 'Contato desta conversa'
                                  : `Contato adicional ${index}`}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {contato.vincular
                                  ? 'Será cadastrado como pessoa e vinculado à empresa.'
                                  : 'Não será cadastrado no CRM.'}
                              </p>
                            </div>
                          </label>

                          {!contato.origemConversa && (
                            <button
                              type="button"
                              onClick={() => removerContatoEmpresa(contato.id)}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                              title="Remover contato"
                            >
                              <Trash2 size={17} />
                            </button>
                          )}
                        </div>

                        {contato.vincular && (
                          <div className="grid gap-4 md:grid-cols-2">
                            <Field label="Nome da pessoa *">
                              <input
                                value={contato.nome}
                                onChange={event =>
                                  atualizarContatoEmpresa(
                                    contato.id,
                                    'nome',
                                    event.target.value
                                  )
                                }
                                className={inputClass}
                              />
                            </Field>

                            <Field label="Cargo / papel na empresa">
                              <input
                                value={contato.papel}
                                onChange={event =>
                                  atualizarContatoEmpresa(
                                    contato.id,
                                    'papel',
                                    event.target.value
                                  )
                                }
                                className={inputClass}
                                placeholder="Ex.: Gerente de RH"
                              />
                            </Field>

                            <Field label="Telefone / WhatsApp">
                              <input
                                value={contato.telefone}
                                onChange={event =>
                                  atualizarContatoEmpresa(
                                    contato.id,
                                    'telefone',
                                    maskPhone(event.target.value)
                                  )
                                }
                                className={inputClass}
                              />
                            </Field>

                            <Field label="CPF (opcional)">
                              <input
                                value={contato.cpf}
                                onChange={event =>
                                  atualizarContatoEmpresa(
                                    contato.id,
                                    'cpf',
                                    maskCPF(event.target.value)
                                  )
                                }
                                className={inputClass}
                                placeholder="000.000.000-00"
                              />
                            </Field>

                            <Field label="E-mail">
                              <input
                                type="email"
                                value={contato.email}
                                onChange={event =>
                                  atualizarContatoEmpresa(
                                    contato.id,
                                    'email',
                                    event.target.value
                                  )
                                }
                                className={inputClass}
                              />
                            </Field>

                            <Field label="Data de nascimento">
                              <input
                                type="date"
                                value={contato.data_nascimento}
                                onChange={event =>
                                  atualizarContatoEmpresa(
                                    contato.id,
                                    'data_nascimento',
                                    event.target.value
                                  )
                                }
                                className={inputClass}
                              />
                            </Field>

                            <Field label="Sexo">
                              <select
                                value={contato.sexo}
                                onChange={event =>
                                  atualizarContatoEmpresa(
                                    contato.id,
                                    'sexo',
                                    event.target.value
                                  )
                                }
                                className={inputClass}
                              >
                                <option value="">Selecione</option>
                                <option value="MASCULINO">Masculino</option>
                                <option value="FEMININO">Feminino</option>
                                <option value="OUTRO">Outro</option>
                              </select>
                            </Field>

                            <Field label="Estado civil">
                              <input
                                value={contato.estado_civil}
                                onChange={event =>
                                  atualizarContatoEmpresa(
                                    contato.id,
                                    'estado_civil',
                                    event.target.value
                                  )
                                }
                                className={inputClass}
                              />
                            </Field>

                            <Field label="Naturalidade">
                              <input
                                value={contato.naturalidade}
                                onChange={event =>
                                  atualizarContatoEmpresa(
                                    contato.id,
                                    'naturalidade',
                                    event.target.value
                                  )
                                }
                                className={inputClass}
                              />
                            </Field>

                            <Field label="Ocupação">
                              <input
                                value={contato.ocupacao}
                                onChange={event =>
                                  atualizarContatoEmpresa(
                                    contato.id,
                                    'ocupacao',
                                    event.target.value
                                  )
                                }
                                className={inputClass}
                              />
                            </Field>

                            <div className="md:col-span-2">
                              <Field label="Observações">
                                <textarea
                                  rows={2}
                                  value={contato.observacoes}
                                  onChange={event =>
                                    atualizarContatoEmpresa(
                                      contato.id,
                                      'observacoes',
                                      event.target.value
                                    )
                                  }
                                  className={`${inputClass} h-auto min-h-[72px] resize-y py-2.5`}
                                />
                              </Field>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {contatosEmpresa.length === 0 && (
                      <EmptyText text="Nenhum contato informado." />
                    )}
                  </div>
                </Section>

                {cnaesSecundarios.length >
                  0 && (
                  <Section title={`CNAEs secundários (${cnaesSecundarios.length})`}>
                    <div className="max-h-48 space-y-2 overflow-y-auto">
                      {cnaesSecundarios.map(
                        (
                          cnae,
                          index
                        ) => (
                          <div
                            key={`${cnae.codigo}-${index}`}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                          >
                            <p className="text-xs font-semibold text-slate-700">
                              {cnae.codigo}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-500">
                              {cnae.descricao ||
                                'Sem descrição'}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </Section>
                )}

                {sociosApi.length > 0 && (
                  <Section title={`Quadro societário — QSA (${sociosApi.length})`}>
                    <div className="space-y-4">
                      {sociosApi.map(socio => (
                        <div
                          key={socio.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-800">
                                {socio.nome}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                {socio.qualificacao && <span>{socio.qualificacao}</span>}
                                {socio.faixa_etaria && <span>{socio.faixa_etaria}</span>}
                                {socio.data_entrada_sociedade && (
                                  <span>Entrada: {socio.data_entrada_sociedade}</span>
                                )}
                              </div>
                            </div>

                            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
                              <input
                                type="checkbox"
                                checked={socio.cadastrarPessoa}
                                onChange={event =>
                                  atualizarSocio(
                                    socio.id,
                                    'cadastrarPessoa',
                                    event.target.checked
                                  )
                                }
                                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                              />
                              Cadastrar / vincular sócio
                            </label>
                          </div>

                          {socio.cadastrarPessoa && (
                            <div className="mt-4 border-t border-slate-200 pt-4">
                              <p className="mb-3 text-xs leading-5 text-slate-500">
                                Complete apenas os dados que você conhece. O CPF mascarado da Receita não é usado como CPF da pessoa.
                              </p>

                              <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Nome do sócio *">
                                  <input
                                    value={socio.nome}
                                    onChange={event =>
                                      atualizarSocio(socio.id, 'nome', event.target.value)
                                    }
                                    className={inputClass}
                                  />
                                </Field>

                                <Field label="Papel / qualificação">
                                  <input
                                    value={socio.qualificacao || ''}
                                    onChange={event =>
                                      atualizarSocio(
                                        socio.id,
                                        'qualificacao',
                                        event.target.value || null
                                      )
                                    }
                                    className={inputClass}
                                  />
                                </Field>

                                <Field label="CPF completo (opcional)">
                                  <input
                                    value={socio.cpf}
                                    onChange={event =>
                                      atualizarSocio(
                                        socio.id,
                                        'cpf',
                                        maskCPF(event.target.value)
                                      )
                                    }
                                    className={inputClass}
                                    placeholder="000.000.000-00"
                                  />
                                </Field>

                                <Field label="Telefone">
                                  <input
                                    value={socio.telefone}
                                    onChange={event =>
                                      atualizarSocio(
                                        socio.id,
                                        'telefone',
                                        maskPhone(event.target.value)
                                      )
                                    }
                                    className={inputClass}
                                  />
                                </Field>

                                <Field label="E-mail">
                                  <input
                                    type="email"
                                    value={socio.email}
                                    onChange={event =>
                                      atualizarSocio(socio.id, 'email', event.target.value)
                                    }
                                    className={inputClass}
                                  />
                                </Field>

                                <Field label="Data de nascimento">
                                  <input
                                    type="date"
                                    value={socio.data_nascimento}
                                    onChange={event =>
                                      atualizarSocio(
                                        socio.id,
                                        'data_nascimento',
                                        event.target.value
                                      )
                                    }
                                    className={inputClass}
                                  />
                                </Field>

                                <Field label="Sexo">
                                  <select
                                    value={socio.sexo}
                                    onChange={event =>
                                      atualizarSocio(socio.id, 'sexo', event.target.value)
                                    }
                                    className={inputClass}
                                  >
                                    <option value="">Selecione</option>
                                    <option value="MASCULINO">Masculino</option>
                                    <option value="FEMININO">Feminino</option>
                                    <option value="OUTRO">Outro</option>
                                  </select>
                                </Field>

                                <Field label="Estado civil">
                                  <input
                                    value={socio.estado_civil}
                                    onChange={event =>
                                      atualizarSocio(
                                        socio.id,
                                        'estado_civil',
                                        event.target.value
                                      )
                                    }
                                    className={inputClass}
                                  />
                                </Field>

                                <Field label="Naturalidade">
                                  <input
                                    value={socio.naturalidade}
                                    onChange={event =>
                                      atualizarSocio(
                                        socio.id,
                                        'naturalidade',
                                        event.target.value
                                      )
                                    }
                                    className={inputClass}
                                  />
                                </Field>

                                <Field label="Ocupação">
                                  <input
                                    value={socio.ocupacao}
                                    onChange={event =>
                                      atualizarSocio(
                                        socio.id,
                                        'ocupacao',
                                        event.target.value
                                      )
                                    }
                                    className={inputClass}
                                  />
                                </Field>

                                <div className="md:col-span-2">
                                  <Field label="Observações">
                                    <textarea
                                      rows={2}
                                      value={socio.observacoes}
                                      onChange={event =>
                                        atualizarSocio(
                                          socio.id,
                                          'observacoes',
                                          event.target.value
                                        )
                                      }
                                      className={`${inputClass} h-auto min-h-[72px] resize-y py-2.5`}
                                    />
                                  </Field>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      O retorno original do QSA permanece integralmente em dados_api_cnpj.
                      Sócios só viram pessoas do CRM quando você marcar explicitamente a opção acima.
                    </p>
                  </Section>
                )}
              </>
            )}

            <Section
              title="Telefones"
              actionLabel="Adicionar telefone"
              onAction={adicionarTelefone}
            >
              <div className="space-y-3">
                {telefones.map(
                  telefone => (
                    <div
                      key={telefone.id}
                      className="grid gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-[1fr_150px_auto]"
                    >
                      <input
                        value={
                          telefone.numero
                        }
                        onChange={event =>
                          atualizarTelefone(
                            telefone.id,
                            'numero',
                            event.target.value
                          )
                        }
                        className={inputClass}
                        placeholder="(48) 99999-9999"
                      />

                      <select
                        value={
                          telefone.tipo
                        }
                        onChange={event =>
                          atualizarTelefone(
                            telefone.id,
                            'tipo',
                            event.target.value
                          )
                        }
                        className={inputClass}
                      >
                        <option value="CELULAR">
                          Celular
                        </option>
                        <option value="COMERCIAL">
                          Comercial
                        </option>
                        <option value="RESIDENCIAL">
                          Residencial
                        </option>
                        <option value="OUTRO">
                          Outro
                        </option>
                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          removerTelefone(
                            telefone.id
                          )
                        }
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <X size={17} />
                      </button>

                      <div className="flex flex-wrap gap-4 md:col-span-3">
                        <CheckField
                          label="WhatsApp"
                          checked={
                            telefone.whatsapp
                          }
                          onChange={value =>
                            atualizarTelefone(
                              telefone.id,
                              'whatsapp',
                              value
                            )
                          }
                        />

                        <CheckField
                          label="Principal"
                          checked={
                            telefone.principal
                          }
                          onChange={value =>
                            atualizarTelefone(
                              telefone.id,
                              'principal',
                              value
                            )
                          }
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            </Section>

            <Section
              title="E-mails"
              actionLabel="Adicionar e-mail"
              onAction={adicionarEmail}
            >
              {emails.length === 0 ? (
                <EmptyText text="Nenhum e-mail informado." />
              ) : (
                <div className="space-y-3">
                  {emails.map(email => (
                    <div
                      key={email.id}
                      className="grid gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-[1fr_150px_auto]"
                    >
                      <div className="relative">
                        <Mail
                          size={15}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                          type="email"
                          value={
                            email.email
                          }
                          onChange={event =>
                            atualizarEmail(
                              email.id,
                              'email',
                              event.target.value
                            )
                          }
                          className={`${inputClass} pl-9`}
                        />
                      </div>

                      <select
                        value={email.tipo}
                        onChange={event =>
                          atualizarEmail(
                            email.id,
                            'tipo',
                            event.target.value
                          )
                        }
                        className={inputClass}
                      >
                        <option value="PESSOAL">
                          Pessoal
                        </option>
                        <option value="COMERCIAL">
                          Comercial
                        </option>
                        <option value="OUTRO">
                          Outro
                        </option>
                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          removerEmail(
                            email.id
                          )
                        }
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <X size={17} />
                      </button>

                      <div className="md:col-span-3">
                        <CheckField
                          label="Principal"
                          checked={
                            email.principal
                          }
                          onChange={value =>
                            atualizarEmail(
                              email.id,
                              'principal',
                              value
                            )
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Endereço">
              <div className="grid gap-4 md:grid-cols-6">
                <div className="md:col-span-2">
                  <Field label="CEP">
                    <div className="relative">
                      <MapPin
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        value={endereco.cep}
                        onChange={event =>
                          void handleCepChange(
                            event.target.value
                          )
                        }
                        className={`${inputClass} pl-9 pr-9`}
                        placeholder="00000-000"
                      />

                      {consultandoCep && (
                        <Loader2
                          size={15}
                          className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-500"
                        />
                      )}
                    </div>
                  </Field>
                </div>

                <div className="md:col-span-3">
                  <Field label="Logradouro">
                    <input
                      value={
                        endereco.logradouro
                      }
                      onChange={event =>
                        setEndereco(
                          current => ({
                            ...current,
                            logradouro:
                              event.target.value,
                          })
                        )
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field label="Número">
                  <input
                    value={endereco.numero}
                    onChange={event =>
                      setEndereco(
                        current => ({
                          ...current,
                          numero:
                            event.target.value,
                        })
                      )
                    }
                    className={inputClass}
                  />
                </Field>

                <div className="md:col-span-2">
                  <Field label="Bairro">
                    <input
                      value={
                        endereco.bairro
                      }
                      onChange={event =>
                        setEndereco(
                          current => ({
                            ...current,
                            bairro:
                              event.target.value,
                          })
                        )
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="md:col-span-2">
                  <Field label="Município">
                    <input
                      value={
                        endereco.municipio
                      }
                      onChange={event =>
                        setEndereco(
                          current => ({
                            ...current,
                            municipio:
                              event.target.value,
                          })
                        )
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field label="UF">
                  <input
                    maxLength={2}
                    value={endereco.uf}
                    onChange={event =>
                      setEndereco(
                        current => ({
                          ...current,
                          uf:
                            event.target.value
                              .toUpperCase()
                              .slice(0, 2),
                        })
                      )
                    }
                    className={inputClass}
                  />
                </Field>

                <div className="md:col-span-6">
                  <Field label="Complemento">
                    <input
                      value={
                        endereco.complemento
                      }
                      onChange={event =>
                        setEndereco(
                          current => ({
                            ...current,
                            complemento:
                              event.target.value,
                          })
                        )
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            </Section>

            <Section title="Observações">
              <textarea
                value={
                  tipo === 'PF'
                    ? pessoa.observacoes
                    : empresa.observacoes
                }
                onChange={event => {
                  if (tipo === 'PF') {
                    setPessoa(
                      current => ({
                        ...current,
                        observacoes:
                          event.target.value,
                      })
                    )
                  } else {
                    setEmpresa(
                      current => ({
                        ...current,
                        observacoes:
                          event.target.value,
                      })
                    )
                  }
                }}
                rows={4}
                className={`${inputClass} resize-none`}
                placeholder="Informações relevantes sobre o cliente..."
              />
            </Section>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-4">
          <div className="text-xs text-slate-400">
            O cadastro será criado como{' '}
            <strong className="font-medium text-slate-600">
              Não Qualificado
            </strong>
            .
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() =>
                void salvar()
              }
              disabled={
                salvando ||
                loadingInicial
              }
              className="flex min-w-[150px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {salvando ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2
                    size={16}
                  />
                  Cadastrar cliente
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================

const inputClass =
  'h-[42px] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400'

const searchButtonClass =
  'flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50'

function Section({
  title,
  actionLabel,
  onAction,
  children,
}: {
  title: string
  actionLabel?: string
  onAction?: () => void
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3.5 sm:px-5">
        <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-600">
          {title}
        </h3>

        {actionLabel &&
          onAction && (
            <button
              type="button"
              onClick={onAction}
              className="text-xs font-medium text-blue-600 transition hover:text-blue-700"
            >
              + {actionLabel}
            </button>
          )}
      </div>

      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">
        {label}
      </span>

      {children}
    </label>
  )
}

function TipoButton({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
        active
          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500/20'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
          active
            ? 'bg-blue-600 text-white'
            : 'bg-slate-100 text-slate-500'
        }`}
      >
        {icon}
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-800">
          {title}
        </p>

        <p className="mt-0.5 text-xs text-slate-500">
          {description}
        </p>
      </div>
    </button>
  )
}

function DocumentoStatus({
  erro,
  verificado,
}: {
  erro: string
  verificado: boolean
}) {
  if (erro) {
    return (
      <p className="mt-1.5 text-xs font-medium text-red-600">
        {erro}
      </p>
    )
  }

  if (verificado) {
    return (
      <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-emerald-600">
        <CheckCircle2 size={13} />
        Documento disponível para cadastro.
      </p>
    )
  }

  return null
}

function BooleanBadge({
  label,
  value,
}: {
  label: string
  value: boolean | null
}) {
  const descricao =
    value === true
      ? 'Sim'
      : value === false
        ? 'Não'
        : 'Não informado'

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-xs text-slate-500">
        {label}:{' '}
      </span>

      <span className="text-xs font-semibold text-slate-700">
        {descricao}
      </span>
    </div>
  )
}

function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (
    value: boolean
  ) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={event =>
          onChange(
            event.target.checked
          )
        }
        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />

      {label}
    </label>
  )
}

function EmptyText({
  text,
}: {
  text: string
}) {
  return (
    <p className="text-sm italic text-slate-400">
      {text}
    </p>
  )
}