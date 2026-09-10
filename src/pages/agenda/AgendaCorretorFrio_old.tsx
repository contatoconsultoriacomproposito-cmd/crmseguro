import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  X, 
  Clock, 
  Phone, 
  MessageCircle, 
  Calendar, 
  Flame, 
  Tag, 
  Plus, 
  Trash2, 
  Send 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ContatoItem {
  id: string;
  nome: string;
  cargo_parentesco?: string;
  telefone: string;
  email: string;
  principal?: boolean;
}

interface AgendaCorretorProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: any | null;
  onSuccess: () => void;
}

export default function AgendaCorretor({
  isOpen,
  onClose,
  cliente,
  onSuccess
}: AgendaCorretorProps) {
  const [loading, setLoading] = useState(false);
  const [historicoAcoes, setHistoricoAcoes] = useState<any[]>([]);

  // Campos de estado de tab_clientes
  const [faseAtendimento, setFaseAtendimento] = useState<string>('nao_contatado');
  const [temperatura, setTemperatura] = useState<string>('frio');
  const [estagio, setEstagio] = useState<string>('nao_prospectado');
  const [proximaAcao, setProximaAcao] = useState<string>('visitar');
  const [novaAcaoRetorno, setNovaAcaoRetorno] = useState<string>('');
  const [novaAcaoHorarioRetorno, setNovaAcaoHorarioRetorno] = useState<string>('09:00');
  const [contatos, setContatos] = useState<ContatoItem[]>([]);

  // Campos de estado de tab_interacoes
  const [tipoAcaoRealizada, setTipoAcaoRealizada] = useState<string>('ligar');
  const [resultadoAcaoRealizada, setResultadoAcaoRealizada] = useState<string>('atendeu');
  const [relatoObs, setRelatoObs] = useState<string>('');

  // Carrega o histórico de interações (tab_interacoes)
  const carregarHistoricoCliente = useCallback(async (clienteId: string) => {
    try {
      const { data, error } = await supabase
        .from('tab_interacoes')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setHistoricoAcoes(data || []);
    } catch (err) {
      console.error('Erro ao carregar histórico de interações:', err);
    }
  }, []);

  // Sincroniza os estados ao carregar o cliente selecionado
  useEffect(() => {
    if (cliente && isOpen) {
      setFaseAtendimento(cliente.fase_atendimento || 'nao_contatado');
      setTemperatura(cliente.temperatura || 'frio');
      setEstagio(cliente.estagio || 'nao_prospectado');
      
      // Trata próxima ação no JSON dados_complementares se disponível
      const dadosComp = typeof cliente.dados_complementares === 'object' && cliente.dados_complementares !== null
        ? cliente.dados_complementares
        : {};
      const proxSugerida = Array.isArray(dadosComp.proxima_acao_sugerida)
        ? dadosComp.proxima_acao_sugerida[0]
        : 'visitar';
      setProximaAcao(proxSugerida || 'visitar');

      setNovaAcaoRetorno(cliente.data_retorno || '');
      setNovaAcaoHorarioRetorno(cliente.horario_retorno || '09:00');

      // Extrai a lista de contatos do JSONB
      let contatosArray: ContatoItem[] = [];
      if (Array.isArray(cliente.contatos)) {
        contatosArray = cliente.contatos;
      } else if (typeof cliente.contatos === 'string') {
        try {
          contatosArray = JSON.parse(cliente.contatos);
        } catch {
          contatosArray = [];
        }
      }
      setContatos(contatosArray);
      setRelatoObs('');

      carregarHistoricoCliente(cliente.id);
    }
  }, [cliente, isOpen, carregarHistoricoCliente]);

  const adicionarContato = () => {
    setContatos(prev => [
      ...prev,
      { id: crypto.randomUUID(), nome: '', cargo_parentesco: '', telefone: '', email: '', principal: false }
    ]);
  };

  const atualizarContato = (id: string, campo: keyof ContatoItem, valor: any) => {
    setContatos(prev =>
      prev.map(c => (c.id === id ? { ...c, [campo]: valor } : c))
    );
  };

  const removerContato = (id: string) => {
    setContatos(prev => prev.filter(c => c.id !== id));
  };

  const handleSaveAction = async () => {
    if (!cliente?.id) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const corretorId = user?.id || cliente.corretor_id;
      const corretoraId = cliente.corretora_id;

      if (!corretorId) {
        toast.error('Corretor não identificado. Faça login novamente.');
        setLoading(false);
        return;
      }

      // 1. Grava no histórico (tab_interacoes)
      const { error: errInteracao } = await supabase
        .from('tab_interacoes')
        .insert({
          cliente_id: cliente.id,
          corretora_id: corretoraId,
          corretor_id: corretorId,
          tipo_acao: tipoAcaoRealizada,
          resultado_acao: resultadoAcaoRealizada,
          proxima_acao: proximaAcao,
          relato: relatoObs || '',
          data_retorno: novaAcaoRetorno || null,
          horario_retorno: novaAcaoHorarioRetorno || null,
          status_agendamento: 'PENDENTE'
        });

      if (errInteracao) throw errInteracao;

      // Preserve os dados_complementares e atualize o array de proxima_acao_sugerida
      const dadosCompAtuais = typeof cliente.dados_complementares === 'object' && cliente.dados_complementares !== null
        ? cliente.dados_complementares
        : {};
      const novosDadosComplementares = {
        ...dadosCompAtuais,
        proxima_acao_sugerida: [proximaAcao]
      };

      // 2. Atualiza os dados cadastrais (tab_clientes)
      const { error: errCliente } = await supabase
        .from('tab_clientes')
        .update({
          fase_atendimento: faseAtendimento,
          temperatura: temperatura,
          estagio: estagio,
          data_retorno: novaAcaoRetorno || null,
          horario_retorno: novaAcaoHorarioRetorno || null,
          contatos: contatos,
          dados_complementares: novosDadosComplementares,
          atualizado_em: new Date().toISOString()
        })
        .eq('id', cliente.id);

      if (errCliente) throw errCliente;

      toast.success('Interação e dados do cliente atualizados!');
      setRelatoObs('');
      
      await carregarHistoricoCliente(cliente.id);
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao registrar interação:', error);
      toast.error('Erro ao salvar informações no banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !cliente) return null;

  // Extração do telefone principal (do JSONB ou campo legado)
  let contatoPrincipal = contatos.find(c => c.principal) || contatos[0];
  const rawPhone = contatoPrincipal?.telefone || cliente.telefone || '';
  const cleanPhone = rawPhone.replace(/\D/g, '');

  const nomeEmpresa = cliente.nome_fantasia && 
    String(cliente.nome_fantasia).trim() !== '******' && 
    String(cliente.nome_fantasia).toUpperCase() !== 'NULL'
      ? cliente.nome_fantasia 
      : cliente.nome_razao_social || "Cliente Sem Nome";

  // Extrai sócios formatados do texto do campo complementar ou JSON
  const dadosComplementares = typeof cliente.dados_complementares === 'object' && cliente.dados_complementares !== null
    ? cliente.dados_complementares
    : {};
  const nomesSociosTexto = dadosComplementares.nomes_socios_texto || '';

  const formatarDataLocal = (dataString: string) => {
    if (!dataString) return '';
    try {
      return new Date(dataString).toLocaleString("pt-BR", {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dataString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 max-h-[92vh] flex flex-col">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-start bg-purple-700 p-4 text-white">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <Clock className="w-6 h-6 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-purple-200">
                Histórico & Atendimento
              </h2>
              <h3 className="text-lg font-black leading-snug break-words uppercase">
                {nomeEmpresa}
              </h3>

              {nomesSociosTexto && (
                <div className="text-xs font-normal text-purple-100 flex flex-col mt-1">
                  {String(nomesSociosTexto).split(/,|\n/).map((socio: string, idx: number) => {
                    const nomeSocio = socio.trim();
                    return nomeSocio ? <span key={idx}>• {nomeSocio}</span> : null;
                  })}
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-purple-800 p-1.5 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Barra de Ações Rápidas */}
        <div className="p-3 bg-slate-100 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs font-mono text-slate-500 dark:text-zinc-400">
            CPF/CNPJ: {cliente.cpf_cnpj || 'Não informado'}
          </div>
          <div className="flex gap-2">
            {cleanPhone ? (
              <a
                href={`https://wa.me/55${cleanPhone}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
              >
                <MessageCircle size={14} /> WhatsApp
              </a>
            ) : (
              <span className="text-xs bg-slate-200 dark:bg-zinc-700 text-slate-500 px-2.5 py-1.5 rounded-lg font-semibold">
                Sem WhatsApp
              </span>
            )}

            {rawPhone ? (
              <a
                href={`tel:${rawPhone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition"
              >
                <Phone size={14} /> Ligar ({rawPhone})
              </a>
            ) : (
              <span className="text-xs bg-slate-200 dark:bg-zinc-700 text-slate-500 px-2.5 py-1.5 rounded-lg font-semibold">
                Sem Telefone
              </span>
            )}
          </div>
        </div>

        {/* Formulário + Histórico */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          
          <div className="bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-xl border border-slate-200 dark:border-zinc-700/60 space-y-3">
            
            {/* Atualização de tab_clientes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-zinc-300 uppercase mb-1">
                  Fase Atendimento
                </label>
                <select 
                  value={faseAtendimento} 
                  onChange={e => setFaseAtendimento(e.target.value)}
                  className="w-full p-2 border rounded-lg text-xs bg-white dark:bg-zinc-800 dark:border-zinc-700 font-medium outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="nao_contatado">⚪ Não Contatado</option>
                  <option value="QUALIFICADO">🔵 Qualificado</option>
                  <option value="tentativa_contato">🟡 Tentativa de Contato</option>
                  <option value="contato_realizado">🔵 Contato Realizado</option>
                  <option value="cotacao_enviada">🟣 Cotação Enviada</option>
                  <option value="em_negociacao">🟠 Em Negociação</option>
                  <option value="vendido">🟢 Vendido</option>
                  <option value="perdido">🔴 Perdido</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-zinc-300 uppercase mb-1 flex items-center gap-1">
                  <Flame size={13} /> Temperatura
                </label>
                <select 
                  value={temperatura} 
                  onChange={e => setTemperatura(e.target.value)}
                  className="w-full p-2 border rounded-lg text-xs bg-white dark:bg-zinc-800 dark:border-zinc-700 font-medium outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="frio">❄️ Frio</option>
                  <option value="morno">🟢 Morno</option>
                  <option value="quente">🔥 Quente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-zinc-300 uppercase mb-1 flex items-center gap-1">
                  <Tag size={13} /> Estágio Comercial
                </label>
                <select 
                  value={estagio} 
                  onChange={e => setEstagio(e.target.value)}
                  className="w-full p-2 border rounded-lg text-xs bg-white dark:bg-zinc-800 dark:border-zinc-700 font-medium outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="nao_prospectado">⚪ Não Prospectado</option>
                  <option value="AGENDADO">📅 Agendado</option>
                  <option value="EM_NEGOCIACAO">🔄 Em Negociação</option>
                  <option value="FECHADO">💼 Fechado</option>
                  <option value="PERDIDO">❌ Perdido</option>
                </select>
              </div>
            </div>

            {/* Registro em tab_interacoes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-zinc-300 uppercase mb-1">
                  Tipo de Ação
                </label>
                <select 
                  value={tipoAcaoRealizada} 
                  onChange={e => setTipoAcaoRealizada(e.target.value)}
                  className="w-full p-2 border rounded-lg text-xs bg-white dark:bg-zinc-800 dark:border-zinc-700 font-medium outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ligar">📞 Ligação</option>
                  <option value="chamar_whats">💬 WhatsApp</option>
                  <option value="visitar">🏢 Visita Presencial</option>
                  <option value="enviar_email">📧 E-mail</option>
                  <option value="outros">📌 Outros</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-zinc-300 uppercase mb-1">
                  Resultado da Ação
                </label>
                <select 
                  value={resultadoAcaoRealizada} 
                  onChange={e => setResultadoAcaoRealizada(e.target.value)}
                  className="w-full p-2 border rounded-lg text-xs bg-white dark:bg-zinc-800 dark:border-zinc-700 font-medium outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="atendeu">✅ Atendeu / Conversou</option>
                  <option value="aguardando_resposta">💬 Aguardando Resposta</option>
                  <option value="caixa_postal">📭 Caixa Postal / Não Atendeu</option>
                  <option value="ocupado">⏳ Ocupado</option>
                  <option value="recado_secretaria">📝 Deixou Recado</option>
                  <option value="pediu_retorno_outro_momento">⏰ Pediu Retorno Depois</option>
                  <option value="sem_interesse">❌ Sem Interesse</option>
                </select>
              </div>
            </div>

            {/* Seleção de Próxima Ação */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-zinc-300 uppercase mb-1">
                Próxima Ação
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "visitar", label: "🏢 Visitar" },
                  { id: "chamar_whats", label: "💬 Chamar no Whats" },
                  { id: "ligar", label: "📞 Ligar" },
                  { id: "enviar_email", label: "📧 Enviar E-mail" },
                  { id: "outros", label: "📌 Outros" }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setProximaAcao(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                      proximaAcao === item.id
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-300 dark:border-zinc-700 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Agendamento de Retorno */}
            <div className="flex items-center gap-3 flex-wrap pt-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-slate-600 dark:text-zinc-300 uppercase">
                  Agendar Retorno:
                </span>
              </div>
              <input 
                type="date" 
                value={novaAcaoRetorno} 
                onChange={e => setNovaAcaoRetorno(e.target.value)}
                className="p-1.5 border rounded-lg text-xs bg-white dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-purple-500" 
              />
              <input 
                type="time" 
                value={novaAcaoHorarioRetorno} 
                onChange={e => setNovaAcaoHorarioRetorno(e.target.value)}
                className="p-1.5 border rounded-lg text-xs bg-white dark:bg-zinc-800 dark:border-zinc-700 outline-none focus:ring-2 focus:ring-purple-500" 
              />
            </div>

            {/* Relato / Observação */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-zinc-300 uppercase mb-1">
                Relato / Detalhes do Atendimento
              </label>
              <textarea 
                rows={2} 
                value={relatoObs} 
                onChange={e => setRelatoObs(e.target.value)} 
                placeholder="Descreva o resumo da conversa ou pontos observados..." 
                className="w-full p-2 border rounded-lg text-xs resize-none outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-zinc-800 dark:border-zinc-700"
              />
            </div>

            {/* Gerenciamento do JSONB `contatos` */}
            <div className="pt-2 border-t border-slate-200 dark:border-zinc-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-zinc-300 uppercase">
                  👥 Contatos Adicionais (JSONB)
                </span>
                <button 
                  type="button" 
                  onClick={adicionarContato}
                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5"/> Adicionar Contato
                </button>
              </div>

              <div className="space-y-2 max-h-36 overflow-y-auto">
                {contatos.map((contato) => (
                  <div key={contato.id} className="grid grid-cols-12 gap-1.5 items-center bg-white dark:bg-zinc-800 p-2 rounded-lg border border-slate-200 dark:border-zinc-700">
                    <input 
                      type="text" 
                      placeholder="Nome" 
                      value={contato.nome} 
                      onChange={e => atualizarContato(contato.id, "nome", e.target.value)}
                      className="col-span-3 p-1 border rounded text-xs outline-none dark:bg-zinc-900 dark:border-zinc-700"
                    />
                    <input 
                      type="text" 
                      placeholder="Cargo / Relação" 
                      value={contato.cargo_parentesco || ''} 
                      onChange={e => atualizarContato(contato.id, "cargo_parentesco", e.target.value)}
                      className="col-span-3 p-1 border rounded text-xs outline-none dark:bg-zinc-900 dark:border-zinc-700"
                    />
                    <input 
                      type="text" 
                      placeholder="Telefone" 
                      value={contato.telefone} 
                      onChange={e => atualizarContato(contato.id, "telefone", e.target.value)}
                      className="col-span-3 p-1 border rounded text-xs outline-none dark:bg-zinc-900 dark:border-zinc-700"
                    />
                    <input 
                      type="email" 
                      placeholder="E-mail" 
                      value={contato.email} 
                      onChange={e => atualizarContato(contato.id, "email", e.target.value)}
                      className="col-span-2 p-1 border rounded text-xs outline-none dark:bg-zinc-900 dark:border-zinc-700"
                    />
                    <button 
                      type="button" 
                      onClick={() => removerContato(contato.id)}
                      className="col-span-1 text-red-500 hover:text-red-700 flex justify-center"
                    >
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={handleSaveAction}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition shadow-sm disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5"/>
                {loading ? 'Salvando...' : 'Registrar Interação'}
              </button>
            </div>
          </div>

          {/* Histórico das interações */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Linha do Tempo de Interações
            </h4>
            {historicoAcoes.length === 0 ? (
              <p className="text-xs text-center text-slate-400 py-4">
                Nenhuma interação registrada até o momento.
              </p>
            ) : (
              historicoAcoes.map((interacao) => (
                <div key={interacao.id} className="relative pl-5 border-l-2 border-purple-300 dark:border-purple-800 space-y-1.5 pb-2">
                  <div className="absolute -left-[5.5px] top-1 w-2.5 h-2.5 bg-purple-600 rounded-full"></div>
                  
                  <div className="flex justify-between items-center text-xs text-slate-500 dark:text-zinc-400">
                    <span className="font-semibold">
                      📅 {formatarDataLocal(interacao.criado_em || `${interacao.data_historico}T${interacao.horario_historico}`)}
                    </span>
                    <div className="flex gap-1.5 flex-wrap">
                      {interacao.tipo_acao && (
                        <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 px-2 py-0.5 rounded font-bold text-[10px] uppercase">
                          {interacao.tipo_acao.replace(/_/g, " ")}
                        </span>
                      )}
                      {interacao.resultado_acao && (
                        <span className="bg-slate-200 text-slate-800 dark:bg-zinc-700 dark:text-zinc-200 px-2 py-0.5 rounded font-bold text-[10px] uppercase">
                          {interacao.resultado_acao.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {interacao.relato && (
                    <p className="text-xs text-slate-700 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-800/60 p-2 rounded-lg border border-slate-100 dark:border-zinc-800">
                      {interacao.relato}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

        </div>

      </div>
    </div>
  );
}