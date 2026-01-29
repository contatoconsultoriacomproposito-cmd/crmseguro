import { useState, useEffect } from 'react';
import { X, Phone, MessageCircle, Calendar, Save, CheckCircle, MessageSquare, Activity, History, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { formatarDataBR } from '../../utils/dateUtils';

interface ModalContatoProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: any;
  onSuccess: () => void;
}

const ETAPAS_SINISTRO = ['Abertura', 'Cadastro', 'Avaliação', 'Solução', 'Conclusão'];

export default function ModalContato({ isOpen, onClose, cliente, onSuccess }: ModalContatoProps) {
  const [abaAtiva, setAbaAtiva] = useState<'COMERCIAL' | 'SINISTRO' | 'HISTORICO'>('COMERCIAL');
  const [loading, setLoading] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [tipoAcao, setTipoAcao] = useState('');
  const [textoAcao, setTextoAcao] = useState('');
  const [dataRetorno, setDataRetorno] = useState('');
  const [horarioRetorno, setHorarioRetorno] = useState('');
  const [horarioRetornoSinistro, setHorarioRetornoSinistro] = useState('');

  const [sinistrosAtivos, setSinistrosAtivos] = useState<any[]>([]);
  const [sinistroSelecionadoId, setSinistroSelecionadoId] = useState('');
  const [etapaSinistro, setEtapaSinistro] = useState('');
  const [relatoSinistro, setRelatoSinistro] = useState('');
  const [dataRetornoSinistro, setDataRetornoSinistro] = useState('');
  const [historicoTotal, setHistoricoTotal] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && cliente) {
      fetchDadosIniciais();
    }
  }, [isOpen, cliente]);

  async function fetchDadosIniciais() {
    try {
      const { data: sinistros } = await supabase
        .from('tab_sinistros')
        .select('id, status, etapa_atual, tab_proposta_itens(base_produtos(nome))')
        .eq('cliente_id', cliente.id)
        .neq('status', 'Encerrado');
      setSinistrosAtivos(sinistros || []);

      const [resInteracoes, resOcorrencias] = await Promise.all([
        supabase.from('tab_interacoes').select('*').eq('cliente_id', cliente.id).order('criado_em', { ascending: false }),
        supabase.from('tab_sinistros_ocorrencias')
          .select('*, tab_sinistros!inner(cliente_id, tab_proposta_itens(base_produtos(nome)))')
          .eq('tab_sinistros.cliente_id', cliente.id)
          .order('criado_em', { ascending: false })
      ]);

      const unificado = [
        ...(resInteracoes.data || []).map(i => ({ ...i, origem: 'COMERCIAL' })),
        ...(resOcorrencias.data || []).map(o => ({ ...o, origem: 'SINISTRO' }))
      ].sort((a, b) => new Date(b.criado_em || b.data_ocorrencia).getTime() - new Date(a.criado_em || a.data_historico).getTime());

      setHistoricoTotal(unificado);
    } catch (err) {
      console.error("Erro ao carregar dados do modal:", err);
    }
  }

  const handleTrocaSinistro = (id: string) => {
    setSinistroSelecionadoId(id);
    const sinistro = sinistrosAtivos.find(s => s.id === id);
    if (sinistro) {
      setEtapaSinistro(sinistro.etapa_atual || 'Cadastro');
    }
  };

  function finalizarSucesso() {
    setSalvo(true);

    // 1. Aguarda 1.5s para o usuário ler o "Sucesso!"
    setTimeout(() => {
      onClose(); // Inicia o fechamento visual do modal

      // 2. Aguarda a animação de fechamento (300ms) para limpar tudo
      setTimeout(() => {
        // Limpeza de Estados
        setSalvo(false);
        setLoading(false);
        setAbaAtiva('COMERCIAL');
        setTipoAcao(''); setTextoAcao(''); setDataRetorno(''); setHorarioRetorno('');
        setSinistroSelecionadoId(''); setEtapaSinistro(''); setRelatoSinistro('');
        setDataRetornoSinistro(''); setHorarioRetornoSinistro('');
        setErro(null);

        // 3. SÓ AGORA avisa o pai para atualizar a lista/dashboard
        // Isso evita o "flicker" (piscar) e garante que o modal já sumiu
        onSuccess(); 
      }, 300);
    }, 1500);
  }

  async function salvarComercial() {
    if (!tipoAcao || !textoAcao) return setErro("Preencha o tipo e o relato.");
    setLoading(true);
    setErro(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: perf } = await supabase.from('usuarios_perfis').select('corretora_id').eq('id', user?.id).single();

      await supabase.from('tab_interacoes').insert([{
        cliente_id: cliente.id,
        corretor_id: user?.id,
        corretora_id: perf?.corretora_id,
        tipo_acao: tipoAcao,
        relato: textoAcao,
        data_historico: new Date().toLocaleDateString('en-CA'),
        horario_historico: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }]);

      await supabase.from('tab_clientes').update({
        data_retorno: dataRetorno || null,
        horario_retorno: horarioRetorno || null,
      }).eq('id', cliente.id);

      finalizarSucesso();
    } catch (err: any) { 
      setErro(err.message); 
      setLoading(false); 
    }
  }

  async function salvarSinistro() {
    if (!sinistroSelecionadoId || !relatoSinistro) return setErro("Selecione o sinistro e relate a ocorrência.");
    if ((etapaSinistro === 'Conclusão' || ['Cadastro', 'Avaliação', 'Solução'].includes(etapaSinistro)) && !dataRetornoSinistro) {
      return setErro("Informe a data necessária para esta fase.");
    }

    setLoading(true);
    setErro(null);
    const isFinalizando = etapaSinistro === 'Conclusão';

    try {
      const { error: errOco } = await supabase.from('tab_sinistros_ocorrencias').insert([{
        sinistro_id: sinistroSelecionadoId,
        etapa: etapaSinistro,
        relato: relatoSinistro,
        data_retorno: dataRetornoSinistro || null,
        data_ocorrencia: new Date().toLocaleDateString('en-CA')
      }]);
      if (errOco) throw errOco;

      const { error: errSin } = await supabase.from('tab_sinistros').update({
        etapa_atual: etapaSinistro,
        status: isFinalizando ? 'Encerrado' : 'Aberto',
        data_conclusao: isFinalizando ? dataRetornoSinistro : null
      }).eq('id', sinistroSelecionadoId);
      if (errSin) throw errSin;

      const { error: errCli } = await supabase.from('tab_clientes').update({
        data_retorno_sinistro: dataRetornoSinistro || null,
        horario_retorno_sinistro: horarioRetornoSinistro || null
      }).eq('id', cliente.id);
      if (errCli) throw errCli;

      finalizarSucesso();
    } catch (err: any) { 
      setErro(err.message); 
      setLoading(false); 
    }
  }

  if (!isOpen || !cliente) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-[32px] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* HEADER COM TABS */}
        <div className="bg-slate-50 dark:bg-zinc-800/50 p-6 border-b dark:border-zinc-800">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest">{cliente.fase_kanban || 'LEAD'}</span>
              <h2 className="text-xl font-black text-slate-800 dark:text-white mt-1">{cliente.nome || cliente.razao_social}</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors"><X size={24} /></button>
          </div>

          <div className="flex bg-slate-200/50 dark:bg-zinc-900 p-1 rounded-2xl gap-1">
            <button onClick={() => setAbaAtiva('COMERCIAL')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${abaAtiva === 'COMERCIAL' ? 'bg-white dark:bg-zinc-800 shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <MessageSquare size={14} /> Comercial
            </button>
            <button onClick={() => setAbaAtiva('SINISTRO')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${abaAtiva === 'SINISTRO' ? 'bg-white dark:bg-zinc-800 shadow-sm text-red-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <Activity size={14} /> Sinistros
            </button>
            <button onClick={() => setAbaAtiva('HISTORICO')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${abaAtiva === 'HISTORICO' ? 'bg-white dark:bg-zinc-800 shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <History size={14} /> Timeline
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-6">
          {/* LOGICA DE EXIBIÇÃO: SE SALVO, MOSTRA SUCESSO. SE NÃO, MOSTRA ABAS. */}
          {salvo ? (
            /* TELA DE SUCESSO - PRIORIDADE MÁXIMA */
            <div className="py-12 text-center animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase italic">Sucesso!</h3>
                <p className="text-xs text-slate-500 font-bold uppercase">Registros atualizados no banco.</p>
              </div>
            ) : (
              /* SÓ RENDERIZA O CONTEÚDO SE NÃO ESTIVER SALVO */
            <div className="space-y-6">
              {erro && <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2 animate-shake"><AlertCircle size={14}/> {erro}</div>}
              
              {/* ABA COMERCIAL */}
              {abaAtiva === 'COMERCIAL' && (
                <div className="space-y-4 animate-in slide-in-from-left-4 duration-300">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <a href={`https://wa.me/55${cliente.telefone_whats?.replace(/\D/g, '')}`} target="_blank" className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-50 text-emerald-600 font-bold text-xs border border-emerald-100 hover:bg-emerald-100 transition-all"><MessageCircle size={16} /> WhatsApp</a>
                    <a href={`tel:${cliente.telefone_whats}`} className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-blue-50 text-blue-600 font-bold text-xs border border-blue-100 hover:bg-blue-100 transition-all"><Phone size={16} /> Ligar</a>
                  </div>
                  <select disabled={loading} value={tipoAcao} onChange={(e) => setTipoAcao(e.target.value)} className="w-full bg-slate-100 dark:bg-zinc-800 border-none rounded-2xl p-4 text-sm font-bold outline-none ring-1 ring-transparent focus:ring-blue-500 transition-all">
                    <option value="">Tipo de Interação...</option>
                    {['WhatsApp', 'Ligação', 'E-mail', 'Reunião Online', 'Reunião Presencial', 'Outros'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <textarea disabled={loading} value={textoAcao} onChange={(e) => setTextoAcao(e.target.value)} placeholder="O que foi conversado com o cliente?" className="w-full bg-slate-100 dark:bg-zinc-800 border-none rounded-2xl p-4 text-sm min-h-[100px] outline-none focus:ring-1 focus:ring-blue-500" />
                  <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50">
                    <h4 className="text-[10px] font-black uppercase text-blue-600 mb-3 flex items-center gap-2"><Calendar size={14} /> Agendar Próximo Contato Comercial</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <input disabled={loading} type="date" value={dataRetorno} onChange={(e) => setDataRetorno(e.target.value)} className="bg-white dark:bg-zinc-800 border-none rounded-xl p-3 text-sm font-bold outline-none ring-1 ring-slate-100 focus:ring-blue-500" />
                      <input disabled={loading} type="time" value={horarioRetorno} onChange={(e) => setHorarioRetorno(e.target.value)} className="bg-white dark:bg-zinc-800 border-none rounded-xl p-3 text-sm font-bold outline-none ring-1 ring-slate-100 focus:ring-blue-500" />
                    </div>
                  </div>
                  <button onClick={salvarComercial} disabled={loading} className="w-full bg-slate-900 dark:bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-lg">{loading ? "Processando..." : <><Save size={16} /> Registrar Comercial</>}</button>
                </div>
              )}

              {abaAtiva === 'SINISTRO' && (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  {sinistrosAtivos.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 font-bold uppercase text-[10px] border-2 border-dashed border-slate-100 dark:border-zinc-800 rounded-[32px]">Este cliente não possui sinistros ativos.</div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Selecione o Sinistro Ativo:</label>
                        <select 
                          disabled={loading}
                          value={sinistroSelecionadoId} 
                          onChange={(e) => handleTrocaSinistro(e.target.value)} 
                          className="w-full bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 border-none rounded-2xl p-4 text-sm font-black outline-none ring-1 ring-red-100"
                        >
                          <option value="">Escolha um sinistro...</option>
                          {sinistrosAtivos.map(s => <option key={s.id} value={s.id}>{s.tab_proposta_itens?.base_produtos?.nome}</option>)}
                        </select>
                      </div>

                      {sinistroSelecionadoId && (
                        <>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Atualizar para Etapa:</label>
                            <select 
                              disabled={loading}
                              value={etapaSinistro} 
                              onChange={(e) => setEtapaSinistro(e.target.value)} 
                              className="w-full bg-slate-100 dark:bg-zinc-800 border-none rounded-2xl p-4 text-sm font-bold outline-none focus:ring-1 focus:ring-red-500"
                            >
                              {ETAPAS_SINISTRO.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                          </div>

                          <textarea 
                            disabled={loading}
                            value={relatoSinistro} 
                            onChange={(e) => setRelatoSinistro(e.target.value)} 
                            placeholder="Descreva o andamento desta atualização..." 
                            className="w-full bg-slate-100 dark:bg-zinc-800 border-none rounded-2xl p-4 text-sm min-h-[100px] outline-none focus:ring-1 focus:ring-red-500" 
                          />

                          <div className="p-4 bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-100/50">
                            <h4 className="text-[10px] font-black uppercase text-red-600 mb-3 flex items-center gap-2">
                              <Calendar size={14} /> {etapaSinistro === 'Conclusão' ? 'Data de Conclusão (Obrigatório)' : 'Data e Hora para Próximo Retorno'}
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                              <input 
                                disabled={loading}
                                type="date" 
                                value={dataRetornoSinistro} 
                                onChange={(e) => setDataRetornoSinistro(e.target.value)} 
                                className="w-full bg-white dark:bg-zinc-800 border-none rounded-xl p-3 text-sm font-bold outline-none ring-1 ring-red-50 focus:ring-red-500" 
                              />
                              <input 
                                disabled={loading}
                                type="time" 
                                value={horarioRetornoSinistro} 
                                onChange={(e) => setHorarioRetornoSinistro(e.target.value)} 
                                className="w-full bg-white dark:bg-zinc-800 border-none rounded-xl p-3 text-sm font-bold outline-none ring-1 ring-red-50 focus:ring-red-500" 
                              />
                          </div>
                        </div>  

                          <button onClick={salvarSinistro} disabled={loading} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-100 dark:shadow-none">
                            {loading ? "Processando..." : <><Save size={16} /> {etapaSinistro === 'Conclusão' ? 'Finalizar Sinistro' : 'Atualizar Sinistro'}</>}
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              {abaAtiva === 'HISTORICO' && (
                <div className="space-y-4 animate-in fade-in duration-500 pb-4">
                  {historicoTotal.length === 0 ? (
                    <p className="text-center py-10 text-slate-400 font-bold uppercase text-[10px]">Nenhuma interação registrada.</p>
                  ) : (
                    historicoTotal.map((item, idx) => (
                      <div key={idx} className={`relative pl-8 pb-6 border-l-2 ${item.origem === 'SINISTRO' ? 'border-red-200' : 'border-blue-200'} last:border-0`}>
                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-white dark:border-zinc-900 ${item.origem === 'SINISTRO' ? 'bg-red-500' : 'bg-blue-500'}`} />
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${item.origem === 'SINISTRO' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                            {item.origem === 'SINISTRO' ? `OP: ${item.etapa}` : item.tipo_acao}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">{formatarDataBR(item.data_historico || item.data_ocorrencia || item.criado_em)}</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-zinc-300 font-medium leading-relaxed italic">"{item.relato}"</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}