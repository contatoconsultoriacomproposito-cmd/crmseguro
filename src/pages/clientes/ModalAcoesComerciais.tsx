import { useEffect, useMemo, useState } from 'react';
import {
  Clock,
  X,
  Trash2,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  Send,
  Plus,
  MessageCircle,
  FileText,
  HelpCircle,
  UserPlus,
  SendHorizontal,
  Check,
  Calendar,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sparkles,
  User,
} from 'lucide-react';

import { maskPhone } from '../../utils/masks';
import { buscarHistoricoInteracoesPorCliente } from './clienteServiceV2';

export interface Contato {
  id?: string;
  nome: string;
  cargo_parentesco: string;
  telefone: string;
  email: string;
  principal?: boolean;
}

export interface AcaoHistorico {
  id: string;
  criado_em: string;
  tipo_acao: string;
  resultado_acao: string;
  objetivo_acao: string;
  proxima_acao?: string;
  data_retorno?: string;
  horario_retorno?: string;
  relato_proxima_acao?: string;
}

export interface LeadData {
  id: string;
  nome_fantasia?: string;
  razao_social?: string;
  nomes_socios?: any;
  data_retorno?: string | null;
  horario_retorno?: string | null;
  contatos_existentes?: Contato[];
  historico_acoes?: AcaoHistorico[];
}

interface ModalAcoesComerciaisProps {
  isOpen: boolean;
  lead?: LeadData | null;
  clienteContexto?: any;
  onClose: () => void;
  onSave: (dadosAcao: any) => Promise<void>;
}

export interface AgendamentoItem {
  id: string;
  proxima_acao: string;
  data_retorno: string;
  horario_retorno: string;
  relato_proxima_acao: string;
  produto_retorno?: string;
}

const TIPOS_ACAO = [
  {
    value: 'ligacao',
    label: 'Ligação',
    icon: Phone,
  },
  {
    value: 'whatsapp',
    label: 'WhatsApp',
    icon: MessageCircle,
  },
  {
    value: 'email',
    label: 'E-mail',
    icon: Mail,
  },
  {
    value: 'visita',
    label: 'Visita',
    icon: MapPin,
  },
  {
    value: 'email_marketing',
    label: 'E-mail Marketing',
    icon: Send,
  },
  {
    value: 'sms',
    label: 'SMS',
    icon: MessageSquare,
  },
  {
    value: 'entrega_folders',
    label: 'Entrega de Folders',
    icon: FileText,
  },
  {
    value: 'outros',
    label: 'Outros',
    icon: HelpCircle,
  },
];

const RESULTADOS_POR_ACAO: Record<string, { value: string; label: string }[]> = {
  ligacao: [
    { value: 'contato_realizado', label: 'Contato realizado' },
    { value: 'nao_atendeu', label: 'Não atendeu' },
    { value: 'numero_invalido', label: 'Número inválido' },
    { value: 'retornar_depois', label: 'Solicitou retorno' },
    { value: 'sem_interesse', label: 'Sem interesse' },
    { value: 'outros', label: 'Outros' },
  ],
  whatsapp: [
    { value: 'mensagem_enviada', label: 'Mensagem enviada' },
    { value: 'respondeu', label: 'Respondeu' },
    { value: 'nao_respondeu', label: 'Não respondeu' },
    { value: 'sem_interesse', label: 'Sem interesse' },
    { value: 'outros', label: 'Outros' },
  ],
  email: [
    { value: 'email_enviado', label: 'E-mail enviado' },
    { value: 'respondeu', label: 'Respondeu' },
    { value: 'nao_respondeu', label: 'Não respondeu' },
    { value: 'sem_interesse', label: 'Sem interesse' },
    { value: 'outros', label: 'Outros' },
  ],
  visita: [
    { value: 'visita_realizada', label: 'Visita realizada' },
    { value: 'visita_agendada', label: 'Visita agendada' },
    { value: 'nao_compareceu', label: 'Não compareceu' },
    { value: 'sem_interesse', label: 'Sem interesse' },
    { value: 'outros', label: 'Outros' },
  ],
  email_marketing: [
    { value: 'enviado', label: 'Enviado' },
    { value: 'respondeu', label: 'Respondeu' },
    { value: 'nao_respondeu', label: 'Não respondeu' },
    { value: 'outros', label: 'Outros' },
  ],
  sms: [
    { value: 'enviado', label: 'Enviado' },
    { value: 'respondeu', label: 'Respondeu' },
    { value: 'nao_respondeu', label: 'Não respondeu' },
    { value: 'outros', label: 'Outros' },
  ],
  entrega_folders: [
    { value: 'entregue', label: 'Entregue' },
    { value: 'nao_entregue', label: 'Não entregue' },
    { value: 'outros', label: 'Outros' },
  ],
  outros: [
    { value: 'realizado', label: 'Realizado' },
    { value: 'pendente', label: 'Pendente' },
    { value: 'outros', label: 'Outros' },
  ],
};

const PROXIMAS_ACOES_OPCOES = [
  { value: 'ligacao', label: 'Ligação' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-mail' },
  { value: 'visita', label: 'Visita' },
  { value: 'email_marketing', label: 'E-mail Marketing' },
  { value: 'sms', label: 'SMS' },
  { value: 'entrega_folders', label: 'Entrega de Folders' },
  { value: 'outros', label: 'Outros' },
];

const PRODUTOS_INTERESSE_OPCOES = [
  'AUTO',
  'RESIDENCIAL',
  'EMPRESARIAL',
  'VIDA EMPRESARIAL',
  'VIDA INDIVIDUAL',
  'ODONTOLÓGICO',
  'SAÚDE',
  'EQUIPAMENTOS',
  'PREVIDÊNCIA',
  'CONDOMÍNIO',
  'VIAGEM',
  'RESPONSABILIDADE CIVIL',
  'OUTROS',
];

const parseArrayData = <T,>(valor: any, padrao: T[] = []): T[] => {
  if (!valor) return padrao;

  let atual = valor;

  while (typeof atual === 'string') {
    try {
      atual = JSON.parse(atual);
    } catch {
      break;
    }
  }

  return Array.isArray(atual) ? atual : padrao;
};

const formatarHora = (hora?: string | null) => {
  if (!hora) return '';

  return hora.length >= 5 ? hora.substring(0, 5) : hora;
};

const formatarData = (data?: string | null) => {
  if (!data) return '';

  const partes = data.split('-');

  if (partes.length !== 3) return data;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

const obterDataHoje = () => {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');

  return `${ano}-${mes}-${dia}`;
};

export default function ModalAcoesComerciais({
  isOpen,
  lead,
  clienteContexto,
  onClose,
  onSave,
}: ModalAcoesComerciaisProps) {
  const activeLead = useMemo(() => {
    const origem = lead || clienteContexto;

    if (!origem) return null;

    return {
      id: origem.id,
      nome_fantasia: origem.nome_fantasia,
      razao_social: origem.razao_social || origem.nome_razao_social,
      nomes_socios: origem.nomes_socios || origem.socios,
      contatos_existentes:
        origem.contatos_existentes ||
        origem.contatos ||
        [],
      historico_acoes:
        origem.historico_acoes ||
        origem.historico ||
        [],
      data_retorno: origem.data_retorno || null,
      horario_retorno: origem.horario_retorno || null,
    };
  }, [lead, clienteContexto]);

  const [modoReagendamento, setModoReagendamento] = useState(false);
  const [dataReagendamento, setDataReagendamento] = useState('');
  const [horarioReagendamento, setHorarioReagendamento] = useState('');

  const [tipoAcao, setTipoAcao] = useState('ligacao');
  const [resultadoAcao, setResultadoAcao] = useState('');
  const [resultadoAcaoOutros, setResultadoAcaoOutros] = useState('');
  const [objetivoAcao, setObjetivoAcao] = useState('Atendimento Comercial');
  const [objetivoAcaoOutros, setObjetivoAcaoOutros] = useState('');

  const [agendamentos, setAgendamentos] = useState<AgendamentoItem[]>([]);
  const [produtosInteresse, setProdutosInteresse] = useState<string[]>([]);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [historicoAcoes, setHistoricoAcoes] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [erroValidacao, setErroValidacao] = useState('');
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [mostrarTodosProdutos, setMostrarTodosProdutos] = useState(false);

  const dataHoje = obterDataHoje();

  const nomeCliente =
    activeLead?.nome_fantasia ||
    activeLead?.razao_social ||
    'Cliente';

  const resultadosDisponiveis =
    RESULTADOS_POR_ACAO[tipoAcao] || RESULTADOS_POR_ACAO.outros;

  const produtosVisiveis = mostrarTodosProdutos
    ? PRODUTOS_INTERESSE_OPCOES
    : PRODUTOS_INTERESSE_OPCOES.slice(0, 6);

  const ultimaAcao = useMemo(() => {
    if (!historicoAcoes.length) return null;

    return historicoAcoes[0];
  }, [historicoAcoes]);

  const sugestaoProximaAcao = useMemo(() => {
    if (!ultimaAcao?.tipo_acao) return null;

    const mapa: Record<string, string> = {
      ligacao: 'whatsapp',
      whatsapp: 'ligacao',
      email: 'ligacao',
      visita: 'ligacao',
      email_marketing: 'ligacao',
      sms: 'ligacao',
      entrega_folders: 'ligacao',
      outros: 'ligacao',
    };

    return mapa[ultimaAcao.tipo_acao] || 'ligacao';
  }, [ultimaAcao]);

  useEffect(() => {
    if (!isOpen || !activeLead?.id) return;

    let ativo = true;

    const carregar = async () => {
      setLoading(false);
      setErroValidacao('');
      setModoReagendamento(false);
      setDataReagendamento('');
      setHorarioReagendamento('');

      setTipoAcao('ligacao');
      setResultadoAcao('');
      setResultadoAcaoOutros('');
      setObjetivoAcao('Atendimento Comercial');
      setObjetivoAcaoOutros('');
      setAgendamentos([]);
      setProdutosInteresse([]);
      setMostrarTodosProdutos(false);

      const contatosAtuais = parseArrayData<Contato>(
        activeLead.contatos_existentes,
        []
      );

      setContatos(contatosAtuais);

      setCarregandoHistorico(true);

      try {
        const historico = await buscarHistoricoInteracoesPorCliente(
          activeLead.id
        );

        if (!ativo) return;

        setHistoricoAcoes(
          historico.length > 0
            ? historico
            : parseArrayData(activeLead.historico_acoes, [])
        );
      } catch {
        if (ativo) {
          setHistoricoAcoes(
            parseArrayData(activeLead.historico_acoes, [])
          );
        }
      } finally {
        if (ativo) {
          setCarregandoHistorico(false);
        }
      }
    };

    carregar();

    return () => {
      ativo = false;
    };
  }, [isOpen, activeLead?.id]);

  if (!isOpen || !activeLead) return null;

  const adicionarAgendamento = () => {
    setAgendamentos((atual) => [
      ...atual,
      {
        id:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`,
        proxima_acao: '',
        data_retorno: '',
        horario_retorno: '',
        relato_proxima_acao: '',
        produto_retorno: '',
      },
    ]);
  };

  const removerAgendamento = (id: string) => {
    setAgendamentos((atual) =>
      atual.filter((item) => item.id !== id)
    );
  };

  const atualizarAgendamento = (
    id: string,
    campo: keyof AgendamentoItem,
    valor: string
  ) => {
    setAgendamentos((atual) =>
      atual.map((item) =>
        item.id === id
          ? {
              ...item,
              [campo]: valor,
            }
          : item
      )
    );
  };

  const alternarProduto = (produto: string) => {
    setProdutosInteresse((atual) =>
      atual.includes(produto)
        ? atual.filter((item) => item !== produto)
        : [...atual, produto]
    );
  };

  const adicionarContato = () => {
    setContatos((atual) => [
      ...atual,
      {
        id:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`,
        nome: '',
        cargo_parentesco: '',
        telefone: '',
        email: '',
        principal: atual.length === 0,
      },
    ]);
  };

  const atualizarContato = (
    index: number,
    campo: keyof Contato,
    valor: string | boolean
  ) => {
    setContatos((atual) =>
      atual.map((contato, i) =>
        i === index
          ? {
              ...contato,
              [campo]:
                campo === 'telefone' && typeof valor === 'string'
                  ? maskPhone(valor)
                  : valor,
            }
          : contato
      )
    );
  };

  const removerContato = (index: number) => {
    setContatos((atual) =>
      atual.filter((_, i) => i !== index)
    );
  };

  const definirContatoPrincipal = (index: number) => {
    setContatos((atual) =>
      atual.map((contato, i) => ({
        ...contato,
        principal: i === index,
      }))
    );
  };

  const aplicarSugestao = () => {
    if (!sugestaoProximaAcao) return;

    setAgendamentos((atual) => {
      if (atual.length === 0) {
        return [
          {
            id:
              typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random()}`,
            proxima_acao: sugestaoProximaAcao,
            data_retorno: '',
            horario_retorno: '',
            relato_proxima_acao: '',
            produto_retorno: '',
          },
        ];
      }

      return atual.map((item, index) =>
        index === 0
          ? {
              ...item,
              proxima_acao: sugestaoProximaAcao,
            }
          : item
      );
    });
  };

  const entrarModoReagendamento = () => {
    setModoReagendamento(true);
    setErroValidacao('');

    setDataReagendamento(
      clienteContexto?.data_retorno ||
      activeLead?.data_retorno ||
      ''
    );

    setHorarioReagendamento(
      formatarHora(
        clienteContexto?.horario_retorno ||
        activeLead?.horario_retorno ||
        ''
      )
    );
  };

  const voltarParaAcaoComercial = () => {
    setModoReagendamento(false);
    setDataReagendamento('');
    setHorarioReagendamento('');
    setErroValidacao('');
  };

  const validarReagendamento = () => {
    if (!dataReagendamento) {
      setErroValidacao('Informe a nova data do retorno.');
      return false;
    }

    if (dataReagendamento < dataHoje) {
      setErroValidacao(
        'A nova data do retorno não pode ser anterior a hoje.'
      );
      return false;
    }

    if (!horarioReagendamento) {
      setErroValidacao('Informe o novo horário do retorno.');
      return false;
    }

    setErroValidacao('');
    return true;
  };

  const validarFormulario = () => {
    if (!resultadoAcao) {
      setErroValidacao('Informe o resultado da ação.');
      return false;
    }

    if (
      (resultadoAcao === 'outros' || tipoAcao === 'outros') &&
      !resultadoAcaoOutros.trim()
    ) {
      setErroValidacao('Informe o resultado da ação.');
      return false;
    }

    if (
      objetivoAcao === 'Outros' &&
      !objetivoAcaoOutros.trim()
    ) {
      setErroValidacao('Informe o objetivo da ação.');
      return false;
    }

    for (const agendamento of agendamentos) {
      if (!agendamento.proxima_acao) {
        setErroValidacao(
          'Informe a próxima ação de todos os retornos.'
        );
        return false;
      }

      if (!agendamento.data_retorno) {
        setErroValidacao(
          'Informe a data de todos os retornos.'
        );
        return false;
      }

      if (agendamento.data_retorno < dataHoje) {
        setErroValidacao(
          'A data do retorno não pode ser anterior a hoje.'
        );
        return false;
      }

      if (!agendamento.horario_retorno) {
        setErroValidacao(
          'Informe o horário de todos os retornos.'
        );
        return false;
      }

      if (!agendamento.relato_proxima_acao.trim()) {
        setErroValidacao(
          'Informe o relato de todos os retornos.'
        );
        return false;
      }
    }

    setErroValidacao('');
    return true;
  };

  const handleSubmeter = async () => {
    if (loading) return;

    if (modoReagendamento) {
      if (!validarReagendamento()) return;

      setLoading(true);

      try {
        await onSave({
          cliente_id: activeLead.id,
          tipo_acao: 'reagendamento',
          data_retorno: dataReagendamento,
          horario_retorno: `${horarioReagendamento}:00`,
        });

        const historicoAtualizado =
          await buscarHistoricoInteracoesPorCliente(
            activeLead.id
          );

        setHistoricoAcoes(historicoAtualizado);
        onClose();
      } catch (error) {
        console.error('Erro ao reagendar retorno:', error);
        setErroValidacao(
          'Não foi possível reagendar o retorno. Tente novamente.'
        );
      } finally {
        setLoading(false);
      }

      return;
    }

    if (!validarFormulario()) return;

    setLoading(true);

    try {
      const resultadoFinal =
        resultadoAcao === 'outros' || tipoAcao === 'outros'
          ? resultadoAcaoOutros
          : resultadoAcao;

      const objetivoFinal =
        objetivoAcao === 'Outros'
          ? objetivoAcaoOutros
          : objetivoAcao;

      const primeiroAgendamento =
        agendamentos[0] || null;

      const payload = {
        cliente_id: activeLead.id,
        tipo_acao: tipoAcao,
        relato:
          primeiroAgendamento?.relato_proxima_acao || '',
        resultado_acao: resultadoFinal || null,
        objetivo_acao: objetivoFinal || null,
        proxima_acao:
          primeiroAgendamento?.proxima_acao || null,
        relato_proxima_acao:
          primeiroAgendamento?.relato_proxima_acao || null,
        produtos_interesse:
          produtosInteresse.length > 0
            ? produtosInteresse
            : null,
        data_retorno:
          primeiroAgendamento?.data_retorno || null,
        horario_retorno:
          primeiroAgendamento?.horario_retorno
            ? `${primeiroAgendamento.horario_retorno}:00`
            : null,
        status_agendamento:
          primeiroAgendamento
            ? 'PENDENTE'
            : null,
        contatos,
      };

      await onSave(payload);

      const historicoAtualizado =
        await buscarHistoricoInteracoesPorCliente(
          activeLead.id
        );

      setHistoricoAcoes(historicoAtualizado);
      onClose();
    } catch (error) {
      console.error(
        'Erro ao registrar ação comercial:',
        error
      );

      setErroValidacao(
        'Não foi possível registrar a ação. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderReagendamento = () => (
    <div className="space-y-6">
      <div className="rounded-xl border border-purple-200 bg-purple-50 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-purple-100 p-2">
            <Calendar className="h-5 w-5 text-purple-700" />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">
              Reagendar retorno
            </h3>

            <p className="mt-1 text-sm text-gray-600">
              Altere somente a data e o horário do próximo
              retorno de {nomeCliente}.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Nova data
          </label>

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

            <input
              type="date"
              min={dataHoje}
              value={dataReagendamento}
              onChange={(e) =>
                setDataReagendamento(e.target.value)
              }
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Novo horário
          </label>

          <div className="relative">
            <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

            <input
              type="time"
              value={horarioReagendamento}
              onChange={(e) =>
                setHorarioReagendamento(e.target.value)
              }
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            />
          </div>
        </div>
      </div>

      {dataReagendamento && horarioReagendamento && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Check className="h-4 w-4 text-green-600" />

            <span>
              Novo retorno:{' '}
              <strong>
                {formatarData(dataReagendamento)}
              </strong>{' '}
              às{' '}
              <strong>
                {horarioReagendamento}
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const renderAcaoComercial = () => (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Última interação
          </h3>

          {carregandoHistorico && (
            <span className="text-xs text-gray-400">
              Carregando...
            </span>
          )}
        </div>

        {ultimaAcao ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                {ultimaAcao.tipo_acao || 'Interação'}
              </span>

              {ultimaAcao.resultado_acao && (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                  {ultimaAcao.resultado_acao}
                </span>
              )}
            </div>

            {ultimaAcao.relato && (
              <p className="mt-3 text-sm text-gray-600">
                {ultimaAcao.relato}
              </p>
            )}

            {ultimaAcao.data_retorno && (
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="h-4 w-4" />
                {formatarData(ultimaAcao.data_retorno)}
                {ultimaAcao.horario_retorno &&
                  ` às ${formatarHora(
                    ultimaAcao.horario_retorno
                  )}`}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500">
            Nenhuma interação registrada.
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />

          <h3 className="text-sm font-semibold text-gray-900">
            Registrar nova ação
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {TIPOS_ACAO.map((tipo) => {
            const Icon = tipo.icon;
            const selecionado = tipoAcao === tipo.value;

            return (
              <button
                key={tipo.value}
                type="button"
                onClick={() => {
                  setTipoAcao(tipo.value);
                  setResultadoAcao('');
                  setResultadoAcaoOutros('');
                }}
                className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${
                  selecionado
                    ? 'border-purple-600 bg-purple-600 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tipo.label}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Resultado da ação
            </label>

            <select
              value={resultadoAcao}
              onChange={(e) =>
                setResultadoAcao(e.target.value)
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            >
              <option value="">
                Selecione o resultado
              </option>

              {resultadosDisponiveis.map((resultado) => (
                <option
                  key={resultado.value}
                  value={resultado.value}
                >
                  {resultado.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Objetivo da ação
            </label>

            <select
              value={objetivoAcao}
              onChange={(e) =>
                setObjetivoAcao(e.target.value)
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            >
              <option value="Atendimento Comercial">
                Atendimento Comercial
              </option>
              <option value="Prospecção">
                Prospecção
              </option>
              <option value="Follow-up">
                Follow-up
              </option>
              <option value="Pós-venda">
                Pós-venda
              </option>
              <option value="Renovação">
                Renovação
              </option>
              <option value="Outros">
                Outros
              </option>
            </select>
          </div>
        </div>

        {(resultadoAcao === 'outros' ||
          tipoAcao === 'outros') && (
          <input
            value={resultadoAcaoOutros}
            onChange={(e) =>
              setResultadoAcaoOutros(e.target.value)
            }
            placeholder="Descreva o resultado"
            className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
          />
        )}

        {objetivoAcao === 'Outros' && (
          <input
            value={objetivoAcaoOutros}
            onChange={(e) =>
              setObjetivoAcaoOutros(e.target.value)
            }
            placeholder="Descreva o objetivo"
            className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
          />
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Próximos passos / Retornos
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              Agende os próximos contatos necessários.
            </p>
          </div>

          <button
            type="button"
            onClick={adicionarAgendamento}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        </div>

        {sugestaoProximaAcao && (
          <button
            type="button"
            onClick={aplicarSugestao}
            className="mb-4 flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-medium text-purple-700 hover:bg-purple-100"
          >
            <Sparkles className="h-4 w-4" />
            Aplicar sugestão de próxima ação
          </button>
        )}

        {agendamentos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500">
            Nenhum retorno agendado.
          </div>
        ) : (
          <div className="space-y-4">
            {agendamentos.map((agendamento, index) => (
              <div
                key={agendamento.id}
                className="rounded-xl border border-gray-200 bg-gray-50 p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">
                    Retorno {index + 1}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      removerAgendamento(agendamento.id)
                    }
                    className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-xs font-medium text-gray-600">
                      Próxima ação
                    </label>

                    <select
                      value={agendamento.proxima_acao}
                      onChange={(e) =>
                        atualizarAgendamento(
                          agendamento.id,
                          'proxima_acao',
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-500"
                    >
                      <option value="">
                        Selecione
                      </option>

                      {PROXIMAS_ACOES_OPCOES.map(
                        (opcao) => (
                          <option
                            key={opcao.value}
                            value={opcao.value}
                          >
                            {opcao.label}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium text-gray-600">
                      Data
                    </label>

                    <input
                      type="date"
                      min={dataHoje}
                      value={agendamento.data_retorno}
                      onChange={(e) =>
                        atualizarAgendamento(
                          agendamento.id,
                          'data_retorno',
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium text-gray-600">
                      Horário
                    </label>

                    <input
                      type="time"
                      value={agendamento.horario_retorno}
                      onChange={(e) =>
                        atualizarAgendamento(
                          agendamento.id,
                          'horario_retorno',
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <textarea
                  value={agendamento.relato_proxima_acao}
                  onChange={(e) =>
                    atualizarAgendamento(
                      agendamento.id,
                      'relato_proxima_acao',
                      e.target.value
                    )
                  }
                  placeholder="Descreva o que deverá ser feito no próximo contato..."
                  rows={2}
                  className="mt-4 w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-500"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Produtos de interesse
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            Selecione os produtos relacionados ao cliente.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {produtosVisiveis.map((produto) => {
            const selecionado =
              produtosInteresse.includes(produto);

            return (
              <button
                key={produto}
                type="button"
                onClick={() => alternarProduto(produto)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  selecionado
                    ? 'border-purple-600 bg-purple-600 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-purple-300'
                }`}
              >
                {selecionado && (
                  <Check className="mr-1 inline h-3 w-3" />
                )}

                {produto}
              </button>
            );
          })}
        </div>

        {PRODUTOS_INTERESSE_OPCOES.length > 6 && (
          <button
            type="button"
            onClick={() =>
              setMostrarTodosProdutos(
                (atual) => !atual
              )
            }
            className="mt-3 flex items-center gap-1 text-xs font-medium text-purple-600"
          >
            {mostrarTodosProdutos ? (
              <>
                Mostrar menos
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Mostrar todos
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Contatos
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              Pessoas relacionadas ao cliente.
            </p>
          </div>

          <button
            type="button"
            onClick={adicionarContato}
            className="flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100"
          >
            <UserPlus className="h-4 w-4" />
            Adicionar
          </button>
        </div>

        {contatos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500">
            Nenhum contato adicional cadastrado.
          </div>
        ) : (
          <div className="space-y-3">
            {contatos.map((contato, index) => (
              <div
                key={contato.id || index}
                className="rounded-xl border border-gray-200 bg-gray-50 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-purple-600" />

                    <span className="text-sm font-medium text-gray-800">
                      Contato {index + 1}
                    </span>

                    {contato.principal && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                        Principal
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      removerContato(index)
                    }
                    className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <input
                    value={contato.nome}
                    onChange={(e) =>
                      atualizarContato(
                        index,
                        'nome',
                        e.target.value
                      )
                    }
                    placeholder="Nome"
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-500"
                  />

                  <input
                    value={contato.cargo_parentesco}
                    onChange={(e) =>
                      atualizarContato(
                        index,
                        'cargo_parentesco',
                        e.target.value
                      )
                    }
                    placeholder="Cargo / Parentesco"
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-500"
                  />

                  <input
                    value={contato.telefone}
                    onChange={(e) =>
                      atualizarContato(
                        index,
                        'telefone',
                        e.target.value
                      )
                    }
                    placeholder="Telefone"
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-500"
                  />

                  <input
                    value={contato.email}
                    onChange={(e) =>
                      atualizarContato(
                        index,
                        'email',
                        e.target.value
                      )
                    }
                    placeholder="E-mail"
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-500"
                  />
                </div>

                <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={Boolean(contato.principal)}
                    onChange={() =>
                      definirContatoPrincipal(index)
                    }
                    className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />

                  Definir como contato principal
                </label>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="shrink-0 bg-gradient-to-r from-purple-800 to-purple-600 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/10 p-2">
                <Clock className="h-6 w-6" />
              </div>

              <div>
                <h2 className="text-lg font-bold">
                  Ações Comerciais & Timeline
                </h2>

                <p className="mt-1 text-sm text-purple-100">
                  {nomeCliente}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={
                  modoReagendamento
                    ? voltarParaAcaoComercial
                    : entrarModoReagendamento
                }
                disabled={loading}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  modoReagendamento
                    ? 'bg-white text-purple-700 hover:bg-purple-50'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                <Calendar className="h-4 w-4" />

                {modoReagendamento
                  ? 'Ação Comercial'
                  : 'Reagendamento'}
              </button>

              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {modoReagendamento
            ? renderReagendamento()
            : renderAcaoComercial()}

          {erroValidacao && (
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <span>{erroValidacao}</span>
            </div>
          )}

          {!modoReagendamento &&
            historicoAcoes.length > 0 && (
              <section className="mt-8">
                <div className="mb-4 flex items-center gap-2">
                  <SendHorizontal className="h-5 w-5 text-purple-600" />

                  <h3 className="text-sm font-semibold text-gray-900">
                    Histórico completo
                  </h3>
                </div>

                <div className="space-y-3">
                  {historicoAcoes.map(
                    (acao, index) => (
                      <div
                        key={acao.id || index}
                        className="relative rounded-xl border border-gray-200 bg-white p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700">
                            {acao.tipo_acao}
                          </span>

                          {acao.resultado_acao && (
                            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700">
                              {acao.resultado_acao}
                            </span>
                          )}

                          {acao.tipo_acao ===
                            'reagendamento' && (
                            <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700">
                              Reagendamento
                            </span>
                          )}
                        </div>

                        {acao.relato && (
                          <p className="mt-3 text-sm text-gray-600">
                            {acao.relato}
                          </p>
                        )}

                        {acao.proxima_acao && (
                          <p className="mt-2 text-xs text-gray-500">
                            Próxima ação:{' '}
                            <strong>
                              {acao.proxima_acao}
                            </strong>
                          </p>
                        )}

                        {acao.data_retorno && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                            <Calendar className="h-4 w-4" />

                            {formatarData(
                              acao.data_retorno
                            )}

                            {acao.horario_retorno &&
                              ` às ${formatarHora(
                                acao.horario_retorno
                              )}`}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              </section>
            )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmeter}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Salvando...
              </>
            ) : modoReagendamento ? (
              <>
                <Calendar className="h-4 w-4" />
                Confirmar Reagendamento
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                {agendamentos.length > 0
                  ? 'Registrar e agendar retorno'
                  : 'Registrar interação'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}