import { useState, useEffect, useCallback } from 'react'; // Removido 'React' pois versões modernas do Next/React não exigem import explícito se não usar React.Component
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import { 
  Search, User, Phone, Mail, 
  Send, Clock, ArrowRight,
  ChevronRight, XCircle, ShieldCheck
} from 'lucide-react'; // Removidos: Filter, FileText, CheckCircle2, AlertCircle, DollarSign
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Indicacao {
  id: string;
  nome_cliente: string;
  telefone_cliente: string;
  email_cliente: string;
  produto_interesse: string;
  obs_indicacao: string;
  status_indicacao: 'NOVO' | 'EM_ATENDIMENTO' | 'COTADO' | 'FINALIZADO' | 'PERDIDO';
  created_at: string;
  tab_parceiros: { nome_parceiro: string };
  parceiro_id: string;
}

export default function ParceirosTriagem() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([]);
  const [busca, setBusca] = useState('');
  const [selecionada, setSelecionada] = useState<Indicacao | null>(null);
  
  const [formCotacao, setFormCotacao] = useState({
    valor_premio: '',
    seguradora: '',
    coberturas_principais: '',
    franquia: '',
    link_proposta_pdf: ''
  });

  // Usando useCallback para evitar avisos de dependência no useEffect
  const carregarIndicacoes = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tab_indicacoes')
        .select('*, tab_parceiros(nome_parceiro)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIndicacoes(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    carregarIndicacoes();
  }, [carregarIndicacoes]);

  async function iniciarAtendimento(id: string) {
    const { error } = await supabase
      .from('tab_indicacoes')
      .update({ status_indicacao: 'EM_ATENDIMENTO' })
      .eq('id', id);
    
    if (!error) carregarIndicacoes();
  }

  async function enviarCotacao() {
    if (!selecionada) return;
    
    try {
      const { error: errCot } = await supabase
        .from('tab_indicacoes_cotacoes')
        .insert([{
          indicacao_id: selecionada.id,
          valor_premio: parseFloat(formCotacao.valor_premio),
          seguradora: formCotacao.seguradora,
          coberturas_principais: formCotacao.coberturas_principais,
          franquia: formCotacao.franquia,
          link_proposta_pdf: formCotacao.link_proposta_pdf
        }]);

      if (errCot) throw errCot;

      await supabase
        .from('tab_indicacoes')
        .update({ status_indicacao: 'COTADO' })
        .eq('id', selecionada.id);

      alert("Cotação enviada ao parceiro!");
      setSelecionada(null);
      carregarIndicacoes();
    } catch (err) {
      alert("Erro ao enviar cotação");
    }
  }

  const filtrados = indicacoes.filter(i => 
    i.nome_cliente.toLowerCase().includes(busca.toLowerCase()) ||
    i.tab_parceiros?.nome_parceiro?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER AREA */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">
              Triagem <span className="text-blue-600">de Indicações</span>
            </h1>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mt-1">
              Incubadora de leads externos e qualificação
            </p>
          </div>

          <div className="relative group w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type="text"
              placeholder="BUSCAR CLIENTE OU PARCEIRO..."
              className="w-full h-12 pl-12 pr-4 bg-white border-2 border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-wider focus:border-blue-500 outline-none transition-all shadow-sm shadow-slate-100"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LISTA DE INDICAÇÕES (ESQUERDA) */}
          <div className="lg:col-span-5 space-y-4">
            {loading ? (
              <div className="p-10 text-center animate-pulse text-slate-400 font-black uppercase text-[10px]">Carregando leads...</div>
            ) : filtrados.map(ind => (
              <div 
                key={ind.id}
                onClick={() => setSelecionada(ind)}
                className={`group cursor-pointer p-5 rounded-[2rem] border-2 transition-all duration-300 ${selecionada?.id === ind.id ? 'border-blue-500 bg-white shadow-xl shadow-blue-100/50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                    ind.status_indicacao === 'NOVO' ? 'bg-amber-100 text-amber-600' :
                    ind.status_indicacao === 'EM_ATENDIMENTO' ? 'bg-blue-100 text-blue-600' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {ind.status_indicacao}
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 italic">
                    {format(new Date(ind.created_at), "dd MMM · HH:mm", { locale: ptBR })}
                  </span>
                </div>
                
                <h3 className="font-black text-slate-800 uppercase text-sm mb-1 group-hover:text-blue-600 transition-colors">{ind.nome_cliente}</h3>
                <p className="text-[10px] font-bold text-slate-500 flex items-center gap-2 mb-4">
                  <User size={12} className="text-blue-500"/> {ind.tab_parceiros?.nome_parceiro || 'Link Direto'}
                </p>

                <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-2">
                    <ShieldCheck size={14} className="text-slate-300"/> {ind.produto_interesse || 'Geral'}
                  </span>
                  <ChevronRight size={16} className={selecionada?.id === ind.id ? 'text-blue-500' : 'text-slate-300'} />
                </div>
              </div>
            ))}
          </div>

          {/* DETALHES E AÇÃO (DIREITA) */}
          <div className="lg:col-span-7">
            {selecionada ? (
              <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 p-8 sticky top-8 shadow-2xl shadow-slate-200/50">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Detalhes da Indicação</h2>
                  <button onClick={() => setSelecionada(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><XCircle size={24} className="text-slate-300"/></button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Telefone de Contato</p>
                      <p className="font-black text-slate-700 flex items-center gap-2"><Phone size={14} className="text-blue-500"/> {selecionada.telefone_cliente}</p>
                   </div>
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">E-mail</p>
                      <p className="font-black text-slate-700 flex items-center gap-2 truncate text-xs"><Mail size={14} className="text-blue-500"/> {selecionada.email_cliente || 'N/A'}</p>
                   </div>
                </div>

                {selecionada.status_indicacao === 'NOVO' ? (
                  <div className="bg-blue-50 p-8 rounded-[2rem] border-2 border-dashed border-blue-200 text-center">
                    <Clock size={40} className="text-blue-400 mx-auto mb-4" />
                    <h3 className="text-blue-800 font-black uppercase text-sm mb-2 italic">Aguardando Início</h3>
                    <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mb-6">Você precisa assumir esta indicação para liberar o formulário de cotação.</p>
                    <button 
                      onClick={() => iniciarAtendimento(selecionada.id)}
                      className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                    >
                      Assumir Atendimento
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-[2px] flex-1 bg-slate-100" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Formulário de Cotação</span>
                      <div className="h-[2px] flex-1 bg-slate-100" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 md:col-span-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Seguradora</label>
                        <input 
                          className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-sm focus:border-blue-500 outline-none" 
                          placeholder="EX: PORTO, BRADESCO..."
                          value={formCotacao.seguradora}
                          onChange={e => setFormCotacao({...formCotacao, seguradora: e.target.value.toUpperCase()})}
                        />
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Valor do Prêmio (R$)</label>
                        <input 
                          type="number"
                          className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-sm focus:border-blue-500 outline-none" 
                          placeholder="0,00"
                          value={formCotacao.valor_premio}
                          onChange={e => setFormCotacao({...formCotacao, valor_premio: e.target.value})}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase ml-2 mb-1 block">Coberturas Principais</label>
                        <textarea 
                          className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-sm focus:border-blue-500 outline-none h-24" 
                          placeholder="DESCREVA AS COBERTURAS QUE O PARCEIRO IRÁ VISUALIZAR..."
                          value={formCotacao.coberturas_principais}
                          onChange={e => setFormCotacao({...formCotacao, coberturas_principais: e.target.value})}
                        />
                      </div>
                    </div>

                    <button 
                      onClick={enviarCotacao}
                      className="w-full h-16 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-3"
                    >
                      <Send size={18}/> Enviar Cotação para o Parceiro
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-[500px] border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center p-10 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                  <ArrowRight size={32} className="text-slate-300" />
                </div>
                <h3 className="text-slate-400 font-black uppercase text-sm tracking-widest italic">Selecione uma indicação para triagem</h3>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}