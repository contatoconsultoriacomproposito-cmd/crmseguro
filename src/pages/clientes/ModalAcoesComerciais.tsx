import { useEffect, useMemo, useState } from 'react';
import {
  Clock,
  X,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Send,
  MessageSquare,
  FileText,
  HelpCircle,
  Check,
  Calendar,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

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
  relato?: string;
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

const TIPOS_ACAO = [
  ['ligacao', 'Ligação', Phone],
  ['whatsapp', 'WhatsApp', MessageCircle],
  ['email', 'E-mail', Mail],
  ['visita', 'Visita', MapPin],
  ['email_marketing', 'E-mail Marketing', Send],
  ['sms', 'SMS', MessageSquare],
  ['entrega_folders', 'Entrega de Folders', FileText],
  ['outros', 'Outros', HelpCircle],
] as const;

const RESULTADOS: Record<string, { value: string; label: string }[]> = {
  ligacao: [
    ['contato_realizado', 'Contato realizado'],
    ['nao_atendeu', 'Não atendeu'],
    ['numero_invalido', 'Número inválido'],
    ['retornar_depois', 'Solicitou retorno'],
    ['sem_interesse', 'Sem interesse'],
    ['outros', 'Outros'],
  ].map(([value, label]) => ({ value, label })),
  whatsapp: [
    ['mensagem_enviada', 'Mensagem enviada'],
    ['respondeu', 'Respondeu'],
    ['nao_respondeu', 'Não respondeu'],
    ['sem_interesse', 'Sem interesse'],
    ['outros', 'Outros'],
  ].map(([value, label]) => ({ value, label })),
  email: [
    ['email_enviado', 'E-mail enviado'],
    ['respondeu', 'Respondeu'],
    ['nao_respondeu', 'Não respondeu'],
    ['sem_interesse', 'Sem interesse'],
    ['outros', 'Outros'],
  ].map(([value, label]) => ({ value, label })),
  visita: [
    ['visita_realizada', 'Visita realizada'],
    ['visita_agendada', 'Visita agendada'],
    ['nao_compareceu', 'Não compareceu'],
    ['sem_interesse', 'Sem interesse'],
    ['outros', 'Outros'],
  ].map(([value, label]) => ({ value, label })),
  email_marketing: [
    ['enviado', 'Enviado'],
    ['respondeu', 'Respondeu'],
    ['nao_respondeu', 'Não respondeu'],
    ['outros', 'Outros'],
  ].map(([value, label]) => ({ value, label })),
  sms: [
    ['enviado', 'Enviado'],
    ['respondeu', 'Respondeu'],
    ['nao_respondeu', 'Não respondeu'],
    ['outros', 'Outros'],
  ].map(([value, label]) => ({ value, label })),
  entrega_folders: [
    ['entregue', 'Entregue'],
    ['nao_entregue', 'Não entregue'],
    ['outros', 'Outros'],
  ].map(([value, label]) => ({ value, label })),
  outros: [
    ['realizado', 'Realizado'],
    ['pendente', 'Pendente'],
    ['outros', 'Outros'],
  ].map(([value, label]) => ({ value, label })),
};

const PRODUTOS = [
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

const hoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const dataBR = (data?: string | null) => {
  if (!data) return '';
  const [ano, mes, dia] = data.split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : data;
};

const horaBR = (hora?: string | null) =>
  hora ? hora.substring(0, 5) : '';

const dataHora = (valor?: string | null) => {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;

  return `${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString(
    'pt-BR',
    { hour: '2-digit', minute: '2-digit' }
  )}`;
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
      data_retorno: origem.data_retorno || null,
      horario_retorno: origem.horario_retorno || null,
      historico_acoes: origem.historico_acoes || origem.historico || [],
    };
  }, [lead, clienteContexto]);

  const nomeCliente =
    activeLead?.nome_fantasia ||
    activeLead?.razao_social ||
    'Cliente';

  const [modoReagendamento, setModoReagendamento] = useState(false);
  const [tipoAcao, setTipoAcao] = useState('ligacao');
  const [resultadoAcao, setResultadoAcao] = useState('');
  const [resultadoOutros, setResultadoOutros] = useState('');
  const [objetivoAcao, setObjetivoAcao] =
    useState('Atendimento Comercial');
  const [objetivoOutros, setObjetivoOutros] = useState('');

  const [produtos, setProdutos] = useState<string[]>([]);
  const [relato, setRelato] = useState('');
  const [dataRetorno, setDataRetorno] = useState('');
  const [horarioRetorno, setHorarioRetorno] = useState('');

  const [dataReagendamento, setDataReagendamento] = useState('');
  const [horarioReagendamento, setHorarioReagendamento] = useState('');

  const [historico, setHistorico] = useState<AcaoHistorico[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [mostrarProdutos, setMostrarProdutos] = useState(false);

  const resultados = RESULTADOS[tipoAcao] || RESULTADOS.outros;

  const ultimaAcao = historico[0];

  const sugestao = useMemo(() => {
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

    return ultimaAcao?.tipo_acao
      ? mapa[ultimaAcao.tipo_acao] || 'ligacao'
      : null;
  }, [ultimaAcao]);

  useEffect(() => {
    if (!isOpen || !activeLead?.id) return;

    let ativo = true;

    const carregar = async () => {
      setModoReagendamento(false);
      setTipoAcao('ligacao');
      setResultadoAcao('');
      setResultadoOutros('');
      setObjetivoAcao('Atendimento Comercial');
      setObjetivoOutros('');
      setProdutos([]);
      setRelato('');
      setDataRetorno('');
      setHorarioRetorno('');
      setErro('');
      setMostrarProdutos(false);
      setCarregandoHistorico(true);

      try {
        const dados = await buscarHistoricoInteracoesPorCliente(
          activeLead.id
        );

        if (!ativo) return;

        setHistorico(
          dados.length
            ? dados
            : Array.isArray(activeLead.historico_acoes)
              ? activeLead.historico_acoes
              : []
        );
      } catch {
        if (ativo) {
          setHistorico(
            Array.isArray(activeLead.historico_acoes)
              ? activeLead.historico_acoes
              : []
          );
        }
      } finally {
        if (ativo) setCarregandoHistorico(false);
      }
    };

    carregar();

    return () => {
      ativo = false;
    };
  }, [isOpen, activeLead?.id]);

  if (!isOpen || !activeLead) return null;

  const alternarProduto = (produto: string) => {
    setProdutos((atual) =>
      atual.includes(produto)
        ? atual.filter((item) => item !== produto)
        : [...atual, produto]
    );
  };

  const entrarReagendamento = () => {
    setModoReagendamento(true);
    setErro('');
    setDataReagendamento(
      clienteContexto?.data_retorno ||
        activeLead.data_retorno ||
        ''
    );
    setHorarioReagendamento(
      horaBR(
        clienteContexto?.horario_retorno ||
          activeLead.horario_retorno ||
          ''
      )
    );
  };

  const sairReagendamento = () => {
    setModoReagendamento(false);
    setErro('');
    setDataReagendamento('');
    setHorarioReagendamento('');
  };

  const validarReagendamento = () => {
    if (!dataReagendamento) {
      setErro('Informe a nova data do retorno.');
      return false;
    }

    if (dataReagendamento < hoje()) {
      setErro('A nova data não pode ser anterior a hoje.');
      return false;
    }

    if (!horarioReagendamento) {
      setErro('Informe o novo horário do retorno.');
      return false;
    }

    return true;
  };

  const validar = () => {
    if (!resultadoAcao) {
      setErro('Informe o resultado da ação.');
      return false;
    }

    if (
      (resultadoAcao === 'outros' || tipoAcao === 'outros') &&
      !resultadoOutros.trim()
    ) {
      setErro('Informe o resultado da ação.');
      return false;
    }

    if (objetivoAcao === 'Outros' && !objetivoOutros.trim()) {
      setErro('Informe o objetivo da ação.');
      return false;
    }

    if (dataRetorno && dataRetorno < hoje()) {
      setErro('A data do retorno não pode ser anterior a hoje.');
      return false;
    }

    if (dataRetorno && !horarioRetorno) {
      setErro('Informe o horário do retorno.');
      return false;
    }

    if (!dataRetorno && horarioRetorno) {
      setErro('Informe a data do retorno.');
      return false;
    }

    if (dataRetorno && !relato.trim()) {
      setErro('Informe o relato do próximo contato.');
      return false;
    }

    setErro('');
    return true;
  };

  const salvar = async () => {
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

        onClose();
      } catch (error) {
        console.error(error);
        setErro('Não foi possível reagendar o retorno.');
      } finally {
        setLoading(false);
      }

      return;
    }

    if (!validar()) return;

    setLoading(true);

    try {
      const resultadoFinal =
        resultadoAcao === 'outros' || tipoAcao === 'outros'
          ? resultadoOutros
          : resultadoAcao;

      const objetivoFinal =
        objetivoAcao === 'Outros'
          ? objetivoOutros
          : objetivoAcao;

      await onSave({
        cliente_id: activeLead.id,
        tipo_acao: tipoAcao,
        relato,
        resultado_acao: resultadoFinal || null,
        objetivo_acao: objetivoFinal || null,
        proxima_acao: dataRetorno ? 'retorno' : null,
        relato_proxima_acao: relato || null,
        produtos_interesse: produtos.length ? produtos : null,
        data_retorno: dataRetorno || null,
        horario_retorno: horarioRetorno
          ? `${horarioRetorno}:00`
          : null,
        status_agendamento: dataRetorno ? 'PENDENTE' : null,
      });

      onClose();
    } catch (error) {
      console.error(error);
      setErro('Não foi possível registrar a ação.');
    } finally {
      setLoading(false);
    }
  };

  const aplicarSugestao = () => {
    if (!sugestao) return;
    setDataRetorno((atual) => atual || '');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="shrink-0 bg-gradient-to-r from-purple-800 to-purple-600 px-6 py-5 text-white">
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

                {produtos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {produtos.map((produto) => (
                      <span
                        key={produto}
                        className="rounded-full bg-white/15 px-2.5 py-1 text-xs text-white"
                      >
                        {produto}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={
                  modoReagendamento
                    ? sairReagendamento
                    : entrarReagendamento
                }
                disabled={loading}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                  modoReagendamento
                    ? 'bg-white text-purple-700'
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
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {modoReagendamento ? (
            <section className="space-y-6">
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-100 p-2">
                    <Calendar className="h-5 w-5 text-purple-700" />
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Reagendar retorno
                    </h3>

                    <p className="mt-1 text-sm text-gray-600">
                      Altere a data e o horário do próximo retorno.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <label className="text-sm font-medium text-gray-700">
                  Nova data
                  <div className="relative mt-2">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                    <input
                      type="date"
                      min={hoje()}
                      value={dataReagendamento}
                      onChange={(e) =>
                        setDataReagendamento(e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                </label>

                <label className="text-sm font-medium text-gray-700">
                  Novo horário
                  <div className="relative mt-2">
                    <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                    <input
                      type="time"
                      value={horarioReagendamento}
                      onChange={(e) =>
                        setHorarioReagendamento(e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                </label>
              </div>

              {dataReagendamento && horarioReagendamento && (
                <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  <Check className="mr-2 inline h-4 w-4 text-green-600" />
                  Novo retorno em{' '}
                  <strong>{dataBR(dataReagendamento)}</strong> às{' '}
                  <strong>{horarioReagendamento}</strong>
                </div>
              )}
            </section>
          ) : (
            <div className="space-y-7">
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
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700">
                          {ultimaAcao.resultado_acao}
                        </span>
                      )}
                    </div>

                    {ultimaAcao.relato && (
                      <p className="mt-3 text-sm text-gray-600">
                        {ultimaAcao.relato}
                      </p>
                    )}

                    {ultimaAcao.criado_em && (
                      <p className="mt-3 text-xs text-gray-500">
                        {dataHora(ultimaAcao.criado_em)}
                      </p>
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
                  {TIPOS_ACAO.map(([value, label, Icon]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setTipoAcao(value);
                        setResultadoAcao('');
                        setResultadoOutros('');
                      }}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${
                        tipoAcao === value
                          ? 'border-purple-600 bg-purple-600 text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="text-sm font-medium text-gray-700">
                    Resultado da ação
                    <select
                      value={resultadoAcao}
                      onChange={(e) =>
                        setResultadoAcao(e.target.value)
                      }
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    >
                      <option value="">
                        Selecione o resultado
                      </option>

                      {resultados.map((resultado) => (
                        <option
                          key={resultado.value}
                          value={resultado.value}
                        >
                          {resultado.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm font-medium text-gray-700">
                    Objetivo da ação
                    <select
                      value={objetivoAcao}
                      onChange={(e) =>
                        setObjetivoAcao(e.target.value)
                      }
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                    >
                      <option>Atendimento Comercial</option>
                      <option>Prospecção</option>
                      <option>Follow-up</option>
                      <option>Pós-venda</option>
                      <option>Renovação</option>
                      <option>Outros</option>
                    </select>
                  </label>
                </div>

                {(resultadoAcao === 'outros' ||
                  tipoAcao === 'outros') && (
                  <input
                    value={resultadoOutros}
                    onChange={(e) =>
                      setResultadoOutros(e.target.value)
                    }
                    placeholder="Descreva o resultado"
                    className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-purple-500"
                  />
                )}

                {objetivoAcao === 'Outros' && (
                  <input
                    value={objetivoOutros}
                    onChange={(e) =>
                      setObjetivoOutros(e.target.value)
                    }
                    placeholder="Descreva o objetivo"
                    className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-purple-500"
                  />
                )}
              </section>

              <section>
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Próximos passos
                  </h3>

                  <p className="mt-1 text-xs text-gray-500">
                    Registre apenas o que deverá acontecer no próximo contato.
                  </p>
                </div>

                {sugestao && (
                  <button
                    type="button"
                    onClick={aplicarSugestao}
                    className="mb-4 flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-medium text-purple-700 hover:bg-purple-100"
                  >
                    <Sparkles className="h-4 w-4" />
                    Sugestão: próximo contato
                  </button>
                )}

                <textarea
                  value={relato}
                  onChange={(e) => setRelato(e.target.value)}
                  placeholder="O que deverá ser feito no próximo contato?"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="text-sm font-medium text-gray-700">
                    Data de retorno
                    <input
                      type="date"
                      min={hoje()}
                      value={dataRetorno}
                      onChange={(e) =>
                        setDataRetorno(e.target.value)
                      }
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-500"
                    />
                  </label>

                  <label className="text-sm font-medium text-gray-700">
                    Horário
                    <input
                      type="time"
                      value={horarioRetorno}
                      onChange={(e) =>
                        setHorarioRetorno(e.target.value)
                      }
                      className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-500"
                    />
                  </label>
                </div>

                {dataRetorno && horarioRetorno && (
                  <div className="mt-3 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
                    <Calendar className="mr-2 inline h-4 w-4" />
                    Retorno em{' '}
                    <strong>{dataBR(dataRetorno)}</strong> às{' '}
                    <strong>{horarioRetorno}</strong>
                  </div>
                )}
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      Produto de interesse
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      Opcional. Selecione um ou mais produtos.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setMostrarProdutos((atual) => !atual)
                    }
                    className="text-xs font-medium text-purple-600"
                  >
                    {mostrarProdutos
                      ? 'Mostrar menos'
                      : 'Mostrar todos'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(mostrarProdutos
                    ? PRODUTOS
                    : PRODUTOS.slice(0, 6)
                  ).map((produto) => (
                    <button
                      key={produto}
                      type="button"
                      onClick={() => alternarProduto(produto)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                        produtos.includes(produto)
                          ? 'border-purple-600 bg-purple-600 text-white'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-purple-300'
                      }`}
                    >
                      {produtos.includes(produto) && (
                        <Check className="mr-1 inline h-3 w-3" />
                      )}
                      {produto}
                    </button>
                  ))}
                </div>
              </section>

              {historico.length > 0 && (
                <section>
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Histórico das ações
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      Registro cronológico das interações comerciais.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {historico.map((acao, index) => (
                      <div
                        key={acao.id || index}
                        className="rounded-xl border border-gray-200 bg-white p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700">
                              {acao.tipo_acao || 'Interação'}
                            </span>

                            {acao.resultado_acao && (
                              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700">
                                {acao.resultado_acao}
                              </span>
                            )}
                          </div>

                          {acao.criado_em && (
                            <span className="text-xs text-gray-400">
                              {dataHora(acao.criado_em)}
                            </span>
                          )}
                        </div>

                        {acao.relato && (
                          <p className="mt-3 text-sm leading-relaxed text-gray-600">
                            {acao.relato}
                          </p>
                        )}

                        {acao.proxima_acao && (
                          <p className="mt-2 text-xs text-gray-500">
                            Próximo passo:{' '}
                            <strong>{acao.proxima_acao}</strong>
                          </p>
                        )}

                        {acao.data_retorno && (
                          <div className="mt-2 text-xs text-gray-500">
                            <Calendar className="mr-1 inline h-3.5 w-3.5" />
                            Retorno:{' '}
                            {dataBR(acao.data_retorno)}
                            {acao.horario_retorno &&
                              ` às ${horaBR(
                                acao.horario_retorno
                              )}`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {erro && (
            <div className="mt-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
              {erro}
            </div>
          )}
        </main>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
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
            onClick={salvar}
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
                Registrar interação
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}

