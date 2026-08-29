// AgendaCorretorFrio.tsx
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

interface ContatoAdicional {
  id: string;
  nome: string;
  cargo_relacao: string;
  telefone: string;
  email: string;
}

interface AgendaCorretorFrioProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: any | null;
  onSuccess: () => void;
}

export default function AgendaCorretorFrio({
  isOpen,
  onClose,
  cliente,
  onSuccess
}: AgendaCorretorFrioProps) {
  const [loading, setLoading] = useState(false);
  const [historicoAcoes, setHistoricoAcoes] = useState<any[]>([]);

  // Campos que pertencem à tab_clientes_frios
  const [faseAtendimento, setFaseAtendimento] = useState<string>('nao_contatado');
  const [temperatura, setTemperatura] = useState<string>('frio');
  const [resultadoAcao, setResultadoAcao] = useState<string>('nao_prospectado');
  const [proximaAcao, setProximaAcao] = useState<string[]>(['visitar']);
  const [novaAcaoRetorno, setNovaAcaoRetorno] = useState<string>('');
  const [novaAcaoHorarioRetorno, setNovaAcaoHorarioRetorno] = useState<string>('09:00');
  const [contatosAdicionais, setContatosAdicionais] = useState<ContatoAdicional[]>([]);

  // Campos que pertencem à tab_clientes_frios_acoes
  const [tipoAcaoRealizada, setTipoAcaoRealizada] = useState<string>('ligar');
  const [desfechoAcaoRealizada, setDesfechoAcaoRealizada] = useState<string>('atendeu');
  const [novaAcaoObs, setNovaAcaoObs] = useState<string>('');

  // Carregar histórico de acionamentos
  const carregarHistoricoLead = useCallback(async (clienteFrioId: string) => {
    try {
      const { data, error } = await supabase
        .from('tab_clientes_frios_acoes')
        .select('*')
        .eq('cliente_frio_id', clienteFrioId)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setHistoricoAcoes(data || []);
    } catch (err) {
      console.error('Erro ao carregar histórico de ações:', err);
    }
  }, []);

  // Sincroniza os estados com os dados do cliente selecionado
  useEffect(() => {
    if (cliente && isOpen) {
      setFaseAtendimento(cliente.fase_atendimento || 'nao_contatado');
      setTemperatura(cliente.temperatura || 'frio');
      setResultadoAcao(cliente.status_prospeccao || 'nao_prospectado');
      setProximaAcao(Array.isArray(cliente.proxima_acao) ? cliente.proxima_acao : ['visitar']);
      setNovaAcaoRetorno(cliente.data_retorno || '');
      setNovaAcaoHorarioRetorno(cliente.horario_retorno || '09:00');
      setContatosAdicionais(
        Array.isArray(cliente.contatos_adicionais) ? cliente.contatos_adicionais : []
      );
      setNovaAcaoObs('');

      carregarHistoricoLead(cliente.id);
    }
  }, [cliente, isOpen, carregarHistoricoLead]);

  const toggleProximaAcao = (id: string) => {
    setProximaAcao(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const adicionarContato = () => {
    setContatosAdicionais(prev => [
      ...prev,
      { id: Date.now().toString(), nome: '', cargo_relacao: '', telefone: '', email: '' }
    ]);
  };

  const atualizarContato = (id: string, campo: keyof ContatoAdicional, valor: string) => {
    setContatosAdicionais(prev =>
      prev.map(c => (c.id === id ? { ...c, [campo]: valor } : c))
    );
  };

  const removerContato = (id: string) => {
    setContatosAdicionais(prev => prev.filter(c => c.id !== id));
  };

  const handleSaveAction = async () => {
    if (!cliente?.id) return;

    setLoading(true);
    try {
      // Obter ID do corretor logado para preencher tab_clientes_frios_acoes.corretor_id (NOT NULL)
      const { data: { user } } = await supabase.auth.getUser();
      const corretorId = user?.id || cliente.corretor_id;

      if (!corretorId) {
        toast.error('Corretor não identificado. Faça login novamente.');
        setLoading(false);
        return;
      }

      // 1. Inserir registro no histórico (tab_clientes_frios_acoes)
      const { error: errAcao } = await supabase
        .from('tab_clientes_frios_acoes')
        .insert({
          cliente_frio_id: cliente.id,
          corretor_id: corretorId,
          tipo_acao: tipoAcaoRealizada,
          desfecho: desfechoAcaoRealizada,
          observacao: novaAcaoObs || null
        });

      if (errAcao) throw errAcao;

      // 2. Atualizar estado atual do cliente frio (tab_clientes_frios)
      const { error: errCliente } = await supabase
        .from('tab_clientes_frios')
        .update({
          fase_atendimento: faseAtendimento,
          temperatura: temperatura,
          status_prospeccao: resultadoAcao,
          proxima_acao: proximaAcao,
          data_retorno: novaAcaoRetorno || null,
          horario_retorno: novaAcaoHorarioRetorno || null,
          contatos_adicionais: contatosAdicionais
        })
        .eq('id', cliente.id);

      if (errCliente) throw errCliente;

      toast.success('Ação registrada e status atualizado!');
      setNovaAcaoObs('');
      
      await carregarHistoricoLead(cliente.id);
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao registrar ação:', error);
      toast.error('Erro ao salvar no banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !cliente) return null;

  const rawPhone = cliente.ddd_telefone_1 || cliente.telefone || '';
  const cleanPhone = rawPhone.replace(/\D/g, '');

  const nomeEmpresa = (
    cliente.nome_fantasia && 
    String(cliente.nome_fantasia).trim() !== '******' && 
    String(cliente.nome_fantasia).toUpperCase() !== 'NULL'
  ) ? cliente.nome_fantasia 
    : (cliente.razao_social && String(cliente.razao_social).trim() !== '******' && String(cliente.razao_social).toUpperCase() !== 'NULL')
      ? cliente.razao_social 
      : "Cliente Sem Nome";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 max-h-[92vh] flex flex-col">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-start bg-purple-700 p-4 text-white">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <Clock className="w-6 h-6 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-purple-200">
                Linha do Tempo de Prospecção
              </h2>
              <h3 className="text-lg font-black leading-snug break-words uppercase">
                {nomeEmpresa}
              </h3>

              {cliente.nomes_socios && 
               String(cliente.nomes_socios).toUpperCase() !== 'NULL' && 
               String(cliente.nomes_socios).trim() !== '******' && (
                <div className="text-xs font-normal text-purple-100 flex flex-col mt-1">
                  {String(cliente.nomes_socios).split(/,|\n/).map((socio: string, idx: number) => {
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

        {/* Resumo/Ações Rápidas */}
        <div className="p-3 bg-slate-100 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs font-mono text-slate-500 dark:text-zinc-400">
            CNPJ: {cliente.cnpj || 'Não informado'}
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
            
            {/* Atualização de tab_clientes_frios */}
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
                  <option value="quente">🔥 Quente</option>
                  <option value="morno">🟢 Morno</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-zinc-300 uppercase mb-1 flex items-center gap-1">
                  <Tag size={13} /> Status Prospecção
                </label>
                <select 
                  value={resultadoAcao} 
                  onChange={e => setResultadoAcao(e.target.value)}
                  className="w-full p-2 border rounded-lg text-xs bg-white dark:bg-zinc-800 dark:border-zinc-700 font-medium outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="nao_prospectado">⚪ Não Prospectado</option>
                  <option value="em_prospeccao">🔄 Em Prospecção</option>
                  <option value="ja_cliente">👑 Já Cliente</option>
                  <option value="convertido">💼 Convertido no CRM</option>
                </select>
              </div>
            </div>

            {/* Registro em tab_clientes_frios_acoes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-zinc-300 uppercase mb-1">
                  1) Tipo de Ação Realizada
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
                  1.1) Desfecho
                </label>
                <select 
                  value={desfechoAcaoRealizada} 
                  onChange={e => setDesfechoAcaoRealizada(e.target.value)}
                  className="w-full p-2 border rounded-lg text-xs bg-white dark:bg-zinc-800 dark:border-zinc-700 font-medium outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="atendeu">✅ Atendeu / Conversou</option>
                  <option value="aguardando_resposta">💬 Aguardando Resposta do Cliente</option>
                  <option value="caixa_postal">📭 Caixa Postal / Não Atendeu</option>
                  <option value="ocupado">⏳ Ocupado</option>
                  <option value="recado_secretaria">📝 Deixou Recado</option>
                  <option value="pediu_retorno_outro_momento">⏰ Pediu para ligar depois</option>
                  <option value="sem_interesse">❌ Sem Interesse</option>
                </select>
              </div>
            </div>

            {/* Seleção de Próxima Ação (text[] em tab_clientes_frios) */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-zinc-300 uppercase mb-1">
                Próxima Ação Recomendada
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
                    onClick={() => toggleProximaAcao(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                      proximaAcao.includes(item.id)
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-300 dark:border-zinc-700 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Agendamento de Retorno (tab_clientes_frios) */}
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

            {/* Observação (tab_clientes_frios_acoes) */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-zinc-300 uppercase mb-1">
                Observação / Resumo do Acionamento
              </label>
              <textarea 
                rows={2} 
                value={novaAcaoObs} 
                onChange={e => setNovaAcaoObs(e.target.value)} 
                placeholder="Digite os detalhes da conversa se houver..." 
                className="w-full p-2 border rounded-lg text-xs resize-none outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-zinc-800 dark:border-zinc-700"
              />
            </div>

            {/* Contatos Adicionais (jsonb em tab_clientes_frios) */}
            <div className="pt-2 border-t border-slate-200 dark:border-zinc-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-600 dark:text-zinc-300 uppercase">
                  👥 Contatos Adicionais / Indicações
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
                {contatosAdicionais.map((contato) => (
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
                      placeholder="Cargo/Relação" 
                      value={contato.cargo_relacao} 
                      onChange={e => atualizarContato(contato.id, "cargo_relacao", e.target.value)}
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
                {loading ? 'Salvando...' : 'Registrar Ação'}
              </button>
            </div>
          </div>

          {/* Renderização do Histórico (tab_clientes_frios_acoes) */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Histórico de Atendimentos
            </h4>
            {historicoAcoes.length === 0 ? (
              <p className="text-xs text-center text-slate-400 py-4">
                Nenhum acionamento registrado no histórico.
              </p>
            ) : (
              historicoAcoes.map((acao) => (
                <div key={acao.id} className="relative pl-5 border-l-2 border-purple-300 dark:border-purple-800 space-y-1.5 pb-2">
                  <div className="absolute -left-[5.5px] top-1 w-2.5 h-2.5 bg-purple-600 rounded-full"></div>
                  
                  <div className="flex justify-between items-center text-xs text-slate-500 dark:text-zinc-400">
                    <span className="font-semibold">
                      📅 {new Date(acao.criado_em).toLocaleString("pt-BR")}
                    </span>
                    <div className="flex gap-1.5 flex-wrap">
                      {acao.tipo_acao && (
                        <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 px-2 py-0.5 rounded font-bold text-[10px] uppercase">
                          {acao.tipo_acao.replace("_", " ")}
                        </span>
                      )}
                      {acao.desfecho && (
                        <span className="bg-slate-200 text-slate-800 dark:bg-zinc-700 dark:text-zinc-200 px-2 py-0.5 rounded font-bold text-[10px] uppercase">
                          {acao.desfecho.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {acao.observacao && (
                    <p className="text-xs text-slate-700 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-800/60 p-2 rounded-lg border border-slate-100 dark:border-zinc-800">
                      {acao.observacao}
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