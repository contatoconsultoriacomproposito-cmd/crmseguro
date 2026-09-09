import React, { useEffect, useMemo, useState } from 'react';
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

// ============================================================
// INTERFACES & TIPAGENS
// ============================================================

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
  produto_retorno?: string; // Produto/Assunto específico do retorno (ex: AUTO, VIDA)
}

// ============================================================
// CONFIGURAÇÕES
// ============================================================

const TIPOS_ACAO = [
  { id: 'ligacao', label: 'Ligação', icon: Phone },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { id: 'email', label: 'E-mail', icon: Mail },
  { id: 'visita', label: 'Visita Presencial', icon: MapPin },
  { id: 'email_marketing', label: 'E-mail Marketing', icon: Send },
  { id: 'sms', label: 'SMS', icon: MessageCircle },
  { id: 'entrega_folders', label: 'Folders/Panfletos', icon: FileText },
  { id: 'outros', label: 'Outros', icon: HelpCircle },
];

const RESULTADOS_POR_ACAO: Record<string, { id: string; label: string }[]> = {
  ligacao: [
    { id: 'atendeu', label: '✅ Atendeu' },
    { id: 'nao_atendeu', label: '❌ Não atendeu' },
    { id: 'caixa_postal', label: '📭 Caixa postal' },
    { id: 'numero_invalido', label: '🚫 Número inválido/bloqueado' },
    { id: 'ocupado', label: '⏳ Ocupado' },
    { id: 'outros', label: '📌 Outros' },
  ],

  whatsapp: [
    { id: 'aguardando_responder', label: '⏳ Aguardando responder' },
    { id: 'respondido', label: '💬 Respondido' },
    { id: 'nao_recebido', label: '⚠️ Não recebido' },
    { id: 'bloqueou', label: '🚫 Bloqueou' },
    { id: 'outros', label: '📌 Outros' },
  ],

  email: [
    { id: 'aguardando_responder', label: '⏳ Aguardando responder' },
    { id: 'respondido', label: '📬 Respondido' },
    { id: 'nao_recebido', label: '⚠️ Não recebido' },
    { id: 'outros', label: '📌 Outros' },
  ],

  visita: [
    { id: 'demonstrou_interesse', label: '🎯 Demonstrou interesse' },
    { id: 'nao_demonstrou_interesse', label: '❌ Não demonstrou interesse' },
    { id: 'decisor_ausente', label: '👤 O decisor não estava' },
    { id: 'outros', label: '📌 Outros' },
  ],

  email_marketing: [
    { id: 'aguardando_responder', label: '⏳ Aguardando responder' },
    { id: 'respondido', label: '📬 Respondido' },
    { id: 'nao_recebido', label: '⚠️ Não recebido' },
    { id: 'outros', label: '📌 Outros' },
  ],

  entrega_folders: [
    { id: 'aguardar_contato', label: '⏳ Aguardar contato' },
  ],

  sms: [
    { id: 'enviado', label: '📤 Enviado com Sucesso' },
    { id: 'nao_entregue', label: '⚠️ Não entregue' },
    { id: 'outros', label: '📌 Outros' },
  ],

  outros: [],
};

const PROXIMAS_ACOES_OPCOES = [
  { id: 'ligacao', label: '📞 Ligar' },
  { id: 'whatsapp', label: '💬 WhatsApp' },
  { id: 'email', label: '📧 E-mail' },
  { id: 'visita', label: '🏢 Visitar' },
  { id: 'email_marketing', label: '📬 E-mail Mkt' },
  { id: 'sms', label: '📱 SMS' },
  { id: 'entrega_folders', label: '📄 Entregar Folders' },
  { id: 'outros', label: '📌 Outros' },
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


const parseArrayData = (data: any): any[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'string') {
    try {
      let parsed = JSON.parse(data);
      // Caso venha duplamente serializado do banco
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

// ============================================================
// COMPONENTE
// ============================================================

export const ModalAcoesComerciais: React.FC<
  ModalAcoesComerciaisProps
> = ({
  isOpen,
  lead,
  clienteContexto,
  onClose,
  onSave,
}) => {
  // ==========================================================
  // LEAD ATIVO
  // ==========================================================

  const activeLead: LeadData | null = lead
  ? {
      id: lead.id,
      razao_social:
        lead.razao_social ||
        (lead as any).nome_razao_social ||
        (lead as any).nome ||
        (lead as any).razaoSocial ||
        'CLIENTE SEM NOME',
      nome_fantasia: lead.nome_fantasia,
      nomes_socios: lead.nomes_socios,
      contatos_existentes: parseArrayData(
        lead.contatos_existentes || (lead as any).contatos
      ),
      historico_acoes: parseArrayData(
        lead.historico_acoes || (lead as any).historico_acoes
      ),
    }
  : clienteContexto
  ? {
      id: clienteContexto.id || 'temp-id',
      razao_social:
        clienteContexto.nome_razao_social ||
        clienteContexto.razao_social ||
        clienteContexto.nome ||
        clienteContexto.razaoSocial ||
        'CLIENTE SEM NOME',
      nome_fantasia: clienteContexto.nome_fantasia,
      nomes_socios:
        clienteContexto.nomes_socios ||
        clienteContexto.socios,
      contatos_existentes: parseArrayData(
        clienteContexto.contatos_existentes || clienteContexto.contatos
      ),
      historico_acoes: parseArrayData(
        clienteContexto.historico_acoes
      ),
    }
  : null;

  // ==========================================================
  // ESTADOS
  // ==========================================================

  const [tipoAcao, setTipoAcao] =
    useState<string>('ligacao');

  const [resultadoAcao, setResultadoAcao] =
    useState<string>('');

  const [resultadoAcaoOutros, setResultadoAcaoOutros] =
    useState<string>('');

  const [objetivoAcao, setObjetivoAcao] =
    useState<string>('Atendimento Comercial');

  const [objetivoAcaoOutros, setObjetivoAcaoOutros] =
    useState<string>('');

  const [agendamentos, setAgendamentos] = 
    useState<AgendamentoItem[]>([]);

  const [produtosInteresse, setProdutosInteresse] =
    useState<string[]>([]);

  const [contatos, setContatos] =
    useState<Contato[]>([]);

  const [loading, setLoading] =
    useState<boolean>(false);

  const [erroValidacao, setErroValidacao] =
    useState<string>('');

  const [historicoAcoes, setHistoricoAcoes] = useState<any[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState<boolean>(false);
  const temHistorico = historicoAcoes.length > 0;

  const [mostrarTodosProdutos, setMostrarTodosProdutos] =
    useState<boolean>(false);



  // ==========================================================
  // RESET AO ABRIR
  // ==========================================================

  const handleAdicionarAgendamento = () => {
    setAgendamentos((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        proxima_acao: 'ligacao',
        data_retorno: '',
        horario_retorno: '',
        relato_proxima_acao: '',
        produto_retorno: produtosInteresse[0] || '',
      },
    ]);
    setErroValidacao('');
  };

  const handleRemoverAgendamento = (id: string) => {
    setAgendamentos((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAtualizarAgendamento = (id: string, campo: keyof AgendamentoItem, valor: string) => {
    setAgendamentos((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [campo]: valor } : item))
    );
    setErroValidacao('');
  };

  useEffect(() => {
  if (!isOpen || !activeLead?.id) return;

  const carregarDadosEHistorico = async () => {
    setCarregandoHistorico(true);

    // 1. Preenche contatos e formulário
    const listaContatos = parseArrayData(
      activeLead.contatos_existentes || (activeLead as any).contatos
    );
    setContatos(listaContatos);

    setTipoAcao('ligacao');
    setResultadoAcao('');
    setResultadoAcaoOutros('');
    setObjetivoAcao('Atendimento Comercial');
    setObjetivoAcaoOutros('');
    setAgendamentos([]);
    setProdutosInteresse([]);
    setErroValidacao('');
    setMostrarTodosProdutos(false);

    // 2. Busca o histórico de interações direto da tabela tab_interacoes_v2
    try {
      const historicoBanco = await buscarHistoricoInteracoesPorCliente(activeLead.id);
      
      // Se não encontrar no banco, usa o que veio no activeLead como fallback
      if (historicoBanco && historicoBanco.length > 0) {
        setHistoricoAcoes(historicoBanco);
      } else {
        setHistoricoAcoes(parseArrayData(activeLead.historico_acoes));
      }
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
      setHistoricoAcoes(parseArrayData(activeLead.historico_acoes));
    } finally {
      setCarregandoHistorico(false);
      setLoading(false);
    }
  };

  carregarDadosEHistorico();
}, [isOpen, lead, clienteContexto]);

  // ==========================================================
  // DADOS DERIVADOS
  // ==========================================================

  const nomeCliente = useMemo(() => {
    if (!activeLead) return 'Cliente sem nome';

    const fantasia =
      activeLead.nome_fantasia &&
      String(activeLead.nome_fantasia).trim() !== '******' &&
      String(activeLead.nome_fantasia).toUpperCase() !== 'NULL'
        ? String(activeLead.nome_fantasia).trim()
        : '';

    const razao =
      activeLead.razao_social &&
      String(activeLead.razao_social).trim() !== '******' &&
      String(activeLead.razao_social).toUpperCase() !== 'NULL'
        ? String(activeLead.razao_social).trim()
        : '';

    return fantasia || razao || 'Cliente sem nome';
  }, [activeLead]);

  const resultadosDisponiveis =
    RESULTADOS_POR_ACAO[tipoAcao] || [];

  const ultimaAcao =
    activeLead?.historico_acoes &&
    activeLead.historico_acoes.length > 0
      ? activeLead.historico_acoes[0]
      : null;

  const produtosVisiveis = mostrarTodosProdutos
    ? PRODUTOS_INTERESSE_OPCOES
    : PRODUTOS_INTERESSE_OPCOES.slice(0, 7);

  const dataHoje = new Date()
    .toISOString()
    .split('T')[0];

  // ==========================================================
  // SUGESTÃO INTELIGENTE DE PRÓXIMA AÇÃO
  // ==========================================================

  const sugestaoProximaAcao = useMemo(() => {
    if (!resultadoAcao) return null;

    if (
      tipoAcao === 'ligacao' &&
      resultadoAcao === 'nao_atendeu'
    ) {
      return {
        texto: 'O cliente não atendeu. Recomendo agendar uma nova ligação.',
        acao: 'ligacao',
      };
    }

    if (
      tipoAcao === 'ligacao' &&
      resultadoAcao === 'caixa_postal'
    ) {
      return {
        texto: 'Caixa postal. Uma nova tentativa de contato pode ser agendada.',
        acao: 'ligacao',
      };
    }

    if (
      tipoAcao === 'whatsapp' &&
      resultadoAcao === 'aguardando_responder'
    ) {
      return {
        texto: 'Cliente ainda não respondeu. Você pode programar um novo contato.',
        acao: 'whatsapp',
      };
    }

    if (
      tipoAcao === 'email' &&
      resultadoAcao === 'aguardando_responder'
    ) {
      return {
        texto: 'E-mail enviado e aguardando resposta.',
        acao: 'email',
      };
    }

    if (
      resultadoAcao === 'demonstrou_interesse'
    ) {
      return {
        texto: 'Cliente demonstrou interesse. Recomendo programar um próximo contato.',
        acao: 'ligacao',
      };
    }

    return null;
  }, [tipoAcao, resultadoAcao]);

  // ==========================================================
  // HANDLERS
  // ==========================================================

  const handleSelectTipoAcao = (
    tipoId: string
  ) => {
    setTipoAcao(tipoId);
    setResultadoAcao('');
    setResultadoAcaoOutros('');
    setErroValidacao('');
  };

  const handleSelectResultado = (
    resultadoId: string
  ) => {
    setResultadoAcao(resultadoId);
    setResultadoAcaoOutros('');
    setErroValidacao('');
  };

  const handleSelectObjetivo = (
    objetivo: string
  ) => {
    setObjetivoAcao(objetivo);

    if (objetivo !== 'Outros') {
      setObjetivoAcaoOutros('');
    }

    setErroValidacao('');
  };

  const handleToggleProduto = (
    produto: string
  ) => {
    setProdutosInteresse((prev) =>
      prev.includes(produto)
        ? prev.filter((p) => p !== produto)
        : [...prev, produto]
    );
  };

  const handleAdicionarContato = () => {
    setContatos((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        nome: '',
        cargo_parentesco: '',
        telefone: '',
        email: '',
        principal: false,
      },
    ]);
  };

  const handleAtualizarContato = (
    index: number,
    campo: keyof Contato,
    valor: string
  ) => {
    const valorFinal =
      campo === 'telefone' ? maskPhone(valor) : valor;

    setContatos((prev) =>
      prev.map((contato, i) =>
        i === index
          ? {
              ...contato,
              [campo]: valorFinal,
            }
          : contato
      )
    );
  };

  const handleRemoverContato = (index: number) => {
    setContatos((prev) => prev.filter((_, i) => i !== index));
  };

  const aplicarSugestao = () => {
    if (!sugestaoProximaAcao) return;

    setAgendamentos((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        proxima_acao: sugestaoProximaAcao.acao,
        data_retorno: '',
        horario_retorno: '',
        relato_proxima_acao: sugestaoProximaAcao.texto || '',
        produto_retorno: produtosInteresse[0] || '',
      },
    ]);

    setErroValidacao('');
  };

  // ==========================================================
  // RENDERIZAÇÃO DOS SÓCIOS
  // ==========================================================

  const renderizarSocios = () => {
    if (!activeLead) return null;

    const sociosRaw =
      activeLead.nomes_socios;

    if (
      !sociosRaw ||
      String(sociosRaw).toUpperCase() === 'NULL' ||
      String(sociosRaw).trim() === '******'
    ) {
      return null;
    }

    let listaNomes: string[] = [];

    if (Array.isArray(sociosRaw)) {
      listaNomes = sociosRaw
        .map((socio) => {
          if (typeof socio === 'string') {
            return socio;
          }

          if (
            socio &&
            typeof socio === 'object'
          ) {
            return (
              socio.nome ||
              socio.razao_social ||
              socio.socio ||
              ''
            );
          }

          return String(socio);
        })
        .filter(Boolean);
    } else if (
      typeof sociosRaw === 'object'
    ) {
      listaNomes = [
        sociosRaw.nome ||
          sociosRaw.razao_social ||
          '',
      ].filter(Boolean);
    } else {
      listaNomes = String(
        sociosRaw
      ).split(/,|\n/);
    }

    if (listaNomes.length === 0) {
      return null;
    }

    return (
      <div className="text-xs font-normal text-purple-100 flex flex-col mt-2 space-y-0.5 border-t border-purple-500/40 pt-2">
        <span className="text-[10px] font-bold uppercase text-purple-300">
          Sócios / Sócias
        </span>

        {listaNomes.map(
          (socio, idx) => {
            const nomeSocio =
              String(socio).trim();

            if (
              !nomeSocio ||
              nomeSocio ===
                '[object Object]'
            ) {
              return null;
            }

            return (
              <span
                key={`${nomeSocio}-${idx}`}
                className="flex items-center gap-1.5 text-purple-100 font-medium"
              >
                <span className="w-1.5 h-1.5 bg-purple-300 rounded-full inline-block" />
                {nomeSocio}
              </span>
            );
          }
        )}
      </div>
    );
  };

  // ==========================================================
  // VALIDAÇÃO
  // ==========================================================

  const validarFormulario = (): boolean => {
    if (!resultadoAcao) {
      setErroValidacao('Informe o resultado da ação realizada.');
      return false;
    }

    if (
      (resultadoAcao === 'outros' || tipoAcao === 'outros') &&
      !resultadoAcaoOutros.trim()
    ) {
      setErroValidacao('Descreva o resultado da ação.');
      return false;
    }

    if (
      objetivoAcao === 'Outros' &&
      !objetivoAcaoOutros.trim()
    ) {
      setErroValidacao('Descreva o objetivo da ação.');
      return false;
    }

    // VALIDAÇÃO DOS MÚLTIPLOS AGENDAMENTOS
    for (let i = 0; i < agendamentos.length; i++) {
      const ag = agendamentos[i];
      const num = agendamentos.length > 1 ? ` (${i + 1}º agendamento)` : '';

      if (!ag.proxima_acao) {
        setErroValidacao(`Informe o tipo de ação para o próximo contato${num}.`);
        return false;
      }

      if (!ag.data_retorno) {
        setErroValidacao(`Informe a data do retorno${num}.`);
        return false;
      }

      if (ag.data_retorno < dataHoje) {
        setErroValidacao(`A data do retorno não pode ser anterior a hoje${num}.`);
        return false;
      }

      if (!ag.horario_retorno) {
        setErroValidacao(`Informe o horário do retorno${num}.`);
        return false;
      }

      if (!ag.relato_proxima_acao.trim()) {
        setErroValidacao(`Informe o que deverá ser tratado na próxima ação${num}.`);
        return false;
      }
    }

    setErroValidacao('');
    return true;
  };

  // ==========================================================
  // SUBMIT
  // ==========================================================

  const handleSubmeter = async () => {
  if (loading) return;

  if (!validarFormulario()) {
    return;
  }

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

    // Primeiro agendamento para extrair os dados da próxima ação
    const primeiroAgendamento = agendamentos[0] || null;

    // Payload formatado de acordo com a tabela tab_interacoes_v2
    const payload = {
      cliente_id: activeLead?.id,
      tipo_acao: tipoAcao,
      relato: primeiroAgendamento?.relato_proxima_acao || '', // Campo texto obrigatório da tabela
      resultado_acao: resultadoFinal || null,
      objetivo_acao: objetivoFinal || null,
      proxima_acao: primeiroAgendamento?.proxima_acao || null, // Deve ser string (text), ex: 'LIGACAO'
      relato_proxima_acao: primeiroAgendamento?.relato_proxima_acao || null,
      produtos_interesse: produtosInteresse.length > 0 ? produtosInteresse : null,
      data_retorno: primeiroAgendamento?.data_retorno || null,
      horario_retorno:
        primeiroAgendamento?.horario_retorno && primeiroAgendamento.horario_retorno.length === 5
          ? `${primeiroAgendamento.horario_retorno}:00`
          : primeiroAgendamento?.horario_retorno || null,
      status_agendamento: primeiroAgendamento ? 'PENDENTE' : null,
      
      // Contatos para atualização se necessário no componente pai
      contatos,
    };

    console.log('Enviando payload para salvar:', payload); // Utilize para depuração no console do navegador

    await onSave(payload);

    // Recarrega o histórico no próprio modal após salvar
    if (activeLead?.id) {
      const historicoAtualizado = await buscarHistoricoInteracoesPorCliente(activeLead.id);
      setHistoricoAcoes(historicoAtualizado);
    }

    onClose();
  } catch (error) {
    console.error('Erro ao registrar ação comercial:', error);
    setErroValidacao('Não foi possível registrar a ação. Tente novamente.');
  } finally {
    setLoading(false);
  }
};

  // ==========================================================
  // RENDER
  // ==========================================================

  if (!isOpen || !activeLead) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-fadeIn">

      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl max-h-[95vh] flex flex-col overflow-hidden border border-purple-100">

        {/* ====================================================
            CABEÇALHO
        ==================================================== */}

        <div className="p-4 border-b flex justify-between items-start gap-3 bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-600 text-white shadow-md">

          <div className="flex items-start gap-3 flex-1 min-w-0">

            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md shrink-0">
              <Clock className="w-6 h-6 text-purple-200" />
            </div>

            <div className="min-w-0 flex-1">

              <span className="text-[10px] uppercase font-bold tracking-widest text-purple-200 bg-purple-800/40 px-2 py-0.5 rounded-full inline-block mb-1 border border-purple-400/30">
                Ações Comerciais & Timeline
              </span>

              <h3 className="font-black text-lg leading-tight uppercase tracking-tight text-white drop-shadow-sm truncate">
                {nomeCliente}
              </h3>

              {renderizarSocios()}

            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all duration-200 hover:rotate-90 shrink-0 disabled:opacity-50"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ====================================================
            CORPO
        ==================================================== */}

        <div className="p-3 sm:p-5 overflow-y-auto flex-1 space-y-5 bg-slate-50/50">

          {/* ==================================================
              ÚLTIMA INTERAÇÃO
          ================================================== */}

          {ultimaAcao && (
            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">

              <div className="flex items-center justify-between gap-2 mb-2">

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600" />

                  <span className="text-[11px] font-black uppercase tracking-wide text-purple-800">
                    Última interação
                  </span>
                </div>

                <span className="text-[10px] text-purple-600 font-semibold">
                  {new Date(
                    ultimaAcao.criado_em
                  ).toLocaleString('pt-BR')}
                </span>

              </div>

              <div className="flex flex-wrap gap-2">

                {ultimaAcao.tipo_acao && (
                  <span className="bg-white border border-purple-200 text-purple-800 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase">
                    {ultimaAcao.tipo_acao.replace(
                      /_/g,
                      ' '
                    )}
                  </span>
                )}

                {ultimaAcao.resultado_acao && (
                  <span className="bg-white border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase">
                    {ultimaAcao.resultado_acao.replace(
                      /_/g,
                      ' '
                    )}
                  </span>
                )}

              </div>

              {ultimaAcao.objetivo_acao && (
                <p className="text-[11px] text-slate-600 mt-2">
                  <strong>Objetivo:</strong>{' '}
                  {ultimaAcao.objetivo_acao}
                </p>
              )}

              {ultimaAcao.relato_proxima_acao && (
                <p className="text-[11px] text-purple-800 mt-1 italic">
                  "{ultimaAcao.relato_proxima_acao}"
                </p>
              )}

            </div>
          )}

          {/* ==================================================
              1. AÇÃO REALIZADA
          ================================================== */}

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">

            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 font-black text-xs flex items-center justify-center">
                1
              </span>

              <div>
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Registrar nova ação
                </h4>

                <p className="text-[10px] text-slate-400">
                  Informe o que aconteceu agora
                </p>
              </div>
            </div>

            {/* TIPO DA AÇÃO */}

            <div>

              <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                O que você fez?
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">

                {TIPOS_ACAO.map((item) => {

                  const Icone = item.icon;

                  const isSelected =
                    tipoAcao === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        handleSelectTipoAcao(
                          item.id
                        )
                      }
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition-all border text-left ${
                        isSelected
                          ? 'bg-purple-50 text-purple-800 border-purple-500 shadow-sm ring-2 ring-purple-500/20'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <Icone
                        className={`w-4 h-4 shrink-0 ${
                          isSelected
                            ? 'text-purple-600'
                            : 'text-slate-400'
                        }`}
                      />

                      <span className="truncate">
                        {item.label}
                      </span>

                      {isSelected && (
                        <Check className="w-3.5 h-3.5 ml-auto shrink-0" />
                      )}
                    </button>
                  );
                })}

              </div>
            </div>

            {/* RESULTADO */}

            <div className="pt-2">

              <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                Qual foi o resultado?
                <span className="text-red-500 ml-1">*</span>
              </label>

              {tipoAcao === 'outros' ? (
                <textarea
                  rows={3}
                  value={resultadoAcaoOutros}
                  onChange={(e) => {
                    setResultadoAcaoOutros(
                      e.target.value
                    );
                    setErroValidacao('');
                  }}
                  placeholder="Descreva o resultado do contato..."
                  className={`w-full p-3 border rounded-xl text-xs outline-none focus:border-purple-500 bg-white resize-none ${
                    erroValidacao
                      ? 'border-red-300'
                      : 'border-slate-200'
                  }`}
                />
              ) : (
                <div className="space-y-3">

                  <div className="flex flex-wrap gap-2">

                    {resultadosDisponiveis.map(
                      (res) => {

                        const isSelected =
                          resultadoAcao ===
                          res.id;

                        return (
                          <button
                            key={res.id}
                            type="button"
                            onClick={() =>
                              handleSelectResultado(
                                res.id
                              )
                            }
                            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                              isSelected
                                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {res.label}
                          </button>
                        );
                      }
                    )}

                  </div>

                  {resultadoAcao ===
                    'outros' && (
                    <input
                      type="text"
                      value={
                        resultadoAcaoOutros
                      }
                      onChange={(e) => {
                        setResultadoAcaoOutros(
                          e.target.value
                        );
                        setErroValidacao('');
                      }}
                      placeholder="Especifique o resultado ocorrido..."
                      className="w-full p-3 border border-purple-200 rounded-xl text-xs outline-none focus:border-purple-500 bg-purple-50/30"
                    />
                  )}

                </div>
              )}

            </div>

            {/* SUGESTÃO */}

            {sugestaoProximaAcao && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />

                <div className="flex-1">
                  <p className="text-[11px] font-bold text-amber-800">
                    Sugestão do CRM
                  </p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    {sugestaoProximaAcao.texto}
                  </p>
                </div>

                {agendamentos.length === 0 && (
                  <button
                    type="button"
                    onClick={aplicarSugestao}
                    className="text-[10px] font-black text-amber-700 bg-white border border-amber-300 px-2.5 py-1.5 rounded-lg hover:bg-amber-100 transition"
                  >
                    Aplicar
                  </button>
                )}
              </div>
            )}

            {/* OBJETIVO */}

            <div className="pt-2 border-t border-slate-100">

              <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                Qual era o objetivo?
              </label>

              <div className="flex flex-wrap gap-2 mb-2">

                {[
                  'Atendimento Comercial',
                  'Acompanhamento de Solicitações (Sinistros/Assistências)',
                  'Outros',
                ].map((obj) => {

                  const isSelected =
                    objetivoAcao === obj;

                  return (
                    <button
                      key={obj}
                      type="button"
                      onClick={() =>
                        handleSelectObjetivo(
                          obj
                        )
                      }
                      className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                        isSelected
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {obj}
                    </button>
                  );
                })}

              </div>

              {objetivoAcao ===
                'Outros' && (
                <input
                  type="text"
                  value={
                    objetivoAcaoOutros
                  }
                  onChange={(e) => {
                    setObjetivoAcaoOutros(
                      e.target.value
                    );
                    setErroValidacao('');
                  }}
                  placeholder="Descreva qual era o objetivo..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs outline-none focus:border-purple-500"
                />
              )}

            </div>

          </div>

          {/* ==================================================
              2. PRÓXIMO PASSO (MÚLTIPLOS AGENDAMENTOS)
            ================================================== */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 font-black text-xs flex items-center justify-center">
                  2
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    Próximos passos / Retornos
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Opcional — programe um ou mais retornos futuros
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAdicionarAgendamento}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition border border-purple-200/60"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar agendamento
              </button>
            </div>

            {/* LISTA DE AGENDAMENTOS */}
            {agendamentos.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-500">
                  Nenhum retorno agendado para esta ação.
                </p>
                <button
                  type="button"
                  onClick={handleAdicionarAgendamento}
                  className="mt-2 text-xs text-purple-600 hover:text-purple-700 font-bold underline"
                >
                  Clique para agendar um retorno
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {agendamentos.map((ag, index) => (
                  <div
                    key={ag.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition space-y-3 relative group"
                  >
                    {/* CABEÇALHO DO CARD DE AGENDAMENTO */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100/70 px-2.5 py-0.5 rounded-md">
                        Agendamento #{index + 1}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoverAgendamento(ag.id)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition"
                        title="Remover agendamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* TIPO DE AÇÃO */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">
                        Tipo de Ação *
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {PROXIMAS_ACOES_OPCOES.map((act) => {
                          const isSelected = ag.proxima_acao === act.id;
                          return (
                            <button
                              key={act.id}
                              type="button"
                              onClick={() =>
                                handleAtualizarAgendamento(ag.id, 'proxima_acao', act.id)
                              }
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                                isSelected
                                  ? 'bg-purple-600 text-white border-purple-600'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {act.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* CAMPOS DE DATA, HORÁRIO E PRODUTO */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                      <div className="grid grid-cols-2 gap-2 md:col-span-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">
                            Data *
                          </label>
                          <div className="relative">
                            <Calendar className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                              type="date"
                              min={dataHoje}
                              value={ag.data_retorno}
                              onChange={(e) =>
                                handleAtualizarAgendamento(ag.id, 'data_retorno', e.target.value)
                              }
                              className="w-full pl-9 pr-2 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-purple-500 font-semibold"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">
                            Horário *
                          </label>
                          <div className="relative">
                            <Clock className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                              type="time"
                              value={ag.horario_retorno}
                              onChange={(e) =>
                                handleAtualizarAgendamento(ag.id, 'horario_retorno', e.target.value)
                              }
                              className="w-full pl-9 pr-2 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-purple-500 font-semibold"
                            />
                          </div>
                        </div>
                      </div>

                      {/* SELEÇÃO DO PRODUTO DO RETORNO */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">
                          Produto do Retorno
                        </label>
                        <select
                          value={ag.produto_retorno || ''}
                          onChange={(e) =>
                            handleAtualizarAgendamento(ag.id, 'produto_retorno', e.target.value)
                          }
                          className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-purple-500 font-semibold h-[38px]"
                        >
                          <option value="">Selecione o produto</option>
                          {produtosVisiveis.map((prod) => (
                            <option key={prod} value={prod}>
                              {prod}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* DETALHES / MENSAGEM */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">
                        O que tratar neste retorno? *
                      </label>
                      <textarea
                        rows={2}
                        value={ag.relato_proxima_acao}
                        onChange={(e) =>
                          handleAtualizarAgendamento(ag.id, 'relato_proxima_acao', e.target.value)
                        }
                        placeholder="Ex.: Apresentar cotação do seguro empresarial..."
                        className="w-full p-2 border border-slate-200 rounded-xl text-xs resize-none outline-none focus:border-purple-500 bg-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ==================================================
              3. PRODUTOS
          ================================================== */}

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">

              <div className="flex items-center gap-2">

                <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 font-black text-xs flex items-center justify-center">
                  3
                </span>

                <div>

                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    Produtos de interesse
                  </h4>

                  <p className="text-[10px] text-slate-400">
                    Opcional
                  </p>

                </div>

              </div>

              {produtosInteresse.length > 0 && (
                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold">
                  {produtosInteresse.length}{' '}
                  selecionado
                  {produtosInteresse.length !==
                  1
                    ? 's'
                    : ''}
                </span>
              )}

            </div>

            <div className="flex flex-wrap gap-2">

              {produtosVisiveis.map(
                (prod) => {

                  const isSelected =
                    produtosInteresse.includes(
                      prod
                    );

                  return (
                    <button
                      key={prod}
                      type="button"
                      onClick={() =>
                        handleToggleProduto(
                          prod
                        )
                      }
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected && (
                        <Check className="w-3.5 h-3.5" />
                      )}

                      {prod}
                    </button>
                  );
                }
              )}

            </div>

            <button
              type="button"
              onClick={() =>
                setMostrarTodosProdutos(
                  (prev) => !prev
                )
              }
              className="text-[10px] font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
            >
              {mostrarTodosProdutos ? (
                <>
                  Mostrar menos
                  <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  Mostrar todos os produtos
                  <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>

          </div>

          {/* ==================================================
              4. CONTATOS
            ================================================== */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 font-black text-xs flex items-center justify-center">
                  4
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                    Contatos
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Contatos e indicações do cliente
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAdicionarContato}
                className="text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 px-3 py-2 rounded-xl font-bold flex items-center gap-1 transition shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Adicionar</span>
                <span className="sm:hidden">+</span>
              </button>
            </div>

            {contatos.length === 0 ? (
              <div className="text-center py-5">
                <User className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">
                  Nenhum contato cadastrado.
                </p>
                <button
                  type="button"
                  onClick={handleAdicionarContato}
                  className="text-[11px] text-purple-600 font-bold mt-1 hover:underline"
                >
                  + Adicionar primeiro contato
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {Array.isArray(contatos) && contatos.map((contato, index) => (
                  <div
                    key={contato.id || `contato-${index}`}
                    className="bg-slate-50 p-3 rounded-xl border border-slate-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-500">
                          Contato #{index + 1}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoverContato(index)}
                        className="text-slate-400 hover:text-red-600 p-1.5 transition"
                        title="Remover contato"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                          Nome
                        </label>
                        <input
                          type="text"
                          autoComplete="off"
                          placeholder="Nome"
                          value={contato.nome || ''}
                          onChange={(e) =>
                            handleAtualizarContato(index, 'nome', e.target.value)
                          }
                          className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                          Cargo / Qualificação
                        </label>
                        <input
                          type="text"
                          autoComplete="off"
                          placeholder="Ex.: Sócio / Diretor"
                          value={contato.cargo_parentesco || ''}
                          onChange={(e) =>
                            handleAtualizarContato(
                              index,
                              'cargo_parentesco',
                              e.target.value
                            )
                          }
                          className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                          Telefone / WhatsApp
                        </label>
                        <input
                          type="text"
                          autoComplete="off"
                          inputMode="tel"
                          placeholder="(00) 00000-0000"
                          value={contato.telefone || ''}
                          onChange={(e) =>
                            handleAtualizarContato(index, 'telefone', e.target.value)
                          }
                          className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                          E-mail
                        </label>
                        <input
                          type="email"
                          autoComplete="off"
                          placeholder="email@exemplo.com"
                          value={contato.email || ''}
                          onChange={(e) =>
                            handleAtualizarContato(index, 'email', e.target.value)
                          }
                          className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ==================================================
              ERRO DE VALIDAÇÃO
            ================================================== */}
          {erroValidacao && (
            <div className="sticky bottom-0 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 shadow-sm z-10">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="text-xs font-semibold">{erroValidacao}</span>
            </div>
          )}

          {/* ==================================================
              BOTÃO PRINCIPAL
            ================================================== */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleSubmeter}
              disabled={loading}
              className="w-full px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg hover:shadow-purple-200 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <SendHorizontal className="w-4 h-4" />
                  {agendamentos.length > 0
                    ? 'Registrar e agendar retorno'
                    : 'Registrar interação'}
                </>
              )}
            </button>
          </div>

          {/* ==================================================
              HISTÓRICO COMPLETO
          ================================================== */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Histórico de ações anteriores
            </h4>

            {carregandoHistorico ? (
              <div className="text-center py-6 text-xs text-slate-400">
                Carregando histórico...
              </div>
            ) : !temHistorico ? (
              <div className="text-center py-6 bg-white rounded-2xl border border-dashed border-slate-200">
                <Clock className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">
                  Nenhum histórico registrado para este cliente.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pl-2">
                {historicoAcoes.map((item, index) => {
                  const dataFormatada = item.criado_em
                    ? new Date(item.criado_em).toLocaleString('pt-BR')
                    : item.data_historico
                    ? `${item.data_historico.split('-').reverse().join('/')} ${item.horario_historico || ''}`
                    : 'Data não informada';

                  return (
                    <div
                      key={item.id || `hist-${index}`}
                      className="relative pl-6 border-l-2 border-purple-200 space-y-1.5 pb-3"
                    >
                      <div className="absolute -left-[5px] top-1 w-2 h-2 bg-purple-600 rounded-full ring-4 ring-purple-100" />

                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                        <span className="font-bold text-slate-700 text-[10px]">
                          📅 {dataFormatada}
                        </span>

                        <div className="flex gap-1.5 flex-wrap">
                          {item.tipo_acao && (
                            <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md font-bold text-[9px] uppercase">
                              {item.tipo_acao.replace(/_/g, ' ')}
                            </span>
                          )}

                          {item.resultado_acao && (
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold text-[9px] uppercase border border-slate-200">
                              {item.resultado_acao.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                      </div>

                      {item.objetivo_acao && (
                        <p className="text-[11px] text-slate-500 font-medium">
                          <strong className="text-slate-600">Objetivo:</strong>{' '}
                          {item.objetivo_acao}
                        </p>
                      )}

                      {/* Exibe o Relato se existir no registro */}
                      {item.relato && (
                        <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {item.relato}
                        </p>
                      )}

                      {item.proxima_acao && (
                        <div className="text-[11px] bg-purple-50/60 border border-purple-100 p-2 rounded-xl text-purple-900 space-y-0.5">
                          <p className="font-bold">
                            Próxima ação:{' '}
                            <span className="uppercase">
                              {item.proxima_acao.replace(/_/g, ' ')}
                            </span>
                            {(item.data_retorno || item.horario_retorno) && (
                              <span className="font-normal text-purple-700 ml-1">
                                (
                                {item.data_retorno &&
                                  item.data_retorno.split('-').reverse().join('/')}
                                {item.horario_retorno && ` às ${item.horario_retorno}`}
                                )
                              </span>
                            )}
                          </p>

                          {item.relato_proxima_acao && (
                            <p className="text-slate-600 italic">
                              "{item.relato_proxima_acao}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};