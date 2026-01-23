import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import { maskCurrency } from '../../utils/masks';
import { 
  Search, User, Clock, XCircle, 
  CheckCircle2, UserPlus, DollarSign, Wallet,
  Phone, Mail, FileText, Info, AlertTriangle, RefreshCwIcon
} from 'lucide-react';
import { format } from 'date-fns';

// 1. Interface atualizada
interface Indicacao {
  id: string;
  nome_cliente: string;
  telefone_cliente: string;
  email_cliente: string;
  produto_interesse: string;
  obs_indicacao: string;
  status_indicacao: 'NOVO' | 'EM_ATENDIMENTO' | 'COTADO' | 'APROVADA_PARCEIRO' | 'VENDIDO' | 'PERDIDO';
  motivo_perda?: string;
  created_at: string;
  tab_parceiros: { 
    nome_parceiro: string 
  };
  // Nova propriedade para os documentos
  tab_indicacoes_documentos?: Array<{
    id: string;
    nome_arquivo: string;
    url_arquivo: string;
    tipo: string;
  }>;

  tab_indicacoes_cotacoes?: Array<{
  valor_premio: number;
  seguradora: string;
  comissao_parceiro?: number;
  data_previsao_comissao?: string; // Adicione este para o formulário de edição
  coberturas_principais: string;
}>;

  
}

export default function ParceirosTriagem() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([]);
  const [busca, setBusca] = useState('');
  const [selecionada, setSelecionada] = useState<Indicacao | null>(null);
  const [seguradoras, setSeguradoras] = useState<{id: string, nome: string}[]>([]);
  const [showSeguradoras, setShowSeguradoras] = useState(false);
  
  // Modais
  const [showRecusaModal, setShowRecusaModal] = useState(false);
  const [showComissaoModal, setShowComissaoModal] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  
  // Formulários
  const [formCotacao, setFormCotacao] = useState({
    valor_premio: '',
    seguradora: '',
    coberturas_principais: ''
    
  });

  const [formComissao, setFormComissao] = useState({
    valor_comissao: '',
    data_previsao_pagamento: ''
  });

  const [formRecusa, setFormRecusa] = useState({
    motivo: '',
    observacao: ''
  });

  const motivosRecusa = ["FORA DO PERFIL", "DADOS INCORRETOS", "CLIENTE JÁ POSSUI SEGURO", "INDICAÇÃO DUPLICADA", "PRODUTO NÃO TRABALHADO", "OUTROS"];

  const handleRefresh = async () => {
    // Não precisamos de setLoading(true) aqui porque carregarIndicacoes() já faz isso internamente
    await carregarIndicacoes();
  };

// Função isolada para as seguradoras
const carregarSeguradoras = useCallback(async () => {
  try {
    const { data, error } = await supabase
      .from('base_seguradoras')
      .select('id, nome')
      .order('nome');
    
    if (error) throw error;
    if (data) setSeguradoras(data);
  } catch (err) {
    console.error("Erro ao carregar base de seguradoras:", err);
  }
}, []);

// Função principal de indicações (Limpa e sem a função interna)
const carregarIndicacoes = useCallback(async () => {
  if (!user) return;
  try {
    setLoading(true);

    const { data: perfil, error: perfilError } = await supabase
      .from('usuarios_perfis')
      .select('tipo_usuario')
      .eq('id', user.id)
      .single();

    if (perfilError) throw perfilError;

    let query = supabase
      .from('tab_indicacoes')
      .select(`
        *,
        tab_parceiros (
          nome_parceiro,
          corretor_id,
          usuarios_perfis:corretor_id (nome)
        ),
        tab_indicacoes_documentos (
          id, nome_arquivo, url_arquivo, tipo
        ),
        tab_indicacoes_cotacoes (*)
      `);

    if (perfil.tipo_usuario === 'CORRETOR') {
      query = query.eq('corretor_id', user.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    setIndicacoes(data || []);
  } catch (err) {
    console.error("Erro ao carregar indicações:", err);
  } finally {
    setLoading(false);
  }
}, [user]);

// useEffect ÚNICO que dispara as duas cargas ao iniciar
useEffect(() => {
  carregarSeguradoras();
  carregarIndicacoes();
}, [carregarSeguradoras, carregarIndicacoes]);

  // Função para assumir o lead (Resolve Erro 400 ao garantir o ID correto)
  async function iniciarAtendimento(id: string) {
    try {
      const { error } = await supabase
        .from('tab_indicacoes')
        .update({ status_indicacao: 'EM_ATENDIMENTO' })
        .eq('id', id);

      if (error) throw error;

      setSuccessToast("ATENDIMENTO ASSUMIDO!");
      setTimeout(() => setSuccessToast(null), 3000);
      carregarIndicacoes();
      if (selecionada) setSelecionada({...selecionada, status_indicacao: 'EM_ATENDIMENTO'});
    } catch (err) {
      console.error("Erro ao iniciar atendimento:", err);
      alert("Erro ao atualizar status. Verifique o console.");
    }
  }

  // Função para enviar cotação (Resolve Erro 403)
  async function enviarCotacao() {
    if (!selecionada) return;
    try {
      // TRATAMENTO DO VALOR: Remove tudo que não é número e divide por 100
      // Isso garante que "R$ 1.500,00" vire exatamente 1500.00
      const valorLimpo = Number(formCotacao.valor_premio.replace(/\D/g, "")) / 100;

      // 1. Insere na tabela de cotações
      const { error: errCot } = await supabase
        .from('tab_indicacoes_cotacoes')
        .insert([{
          indicacao_id: selecionada.id,
          valor_premio: valorLimpo || 0,
          seguradora: formCotacao.seguradora,
          coberturas_principais: formCotacao.coberturas_principais
        }]);

      if (errCot) throw errCot;

      // 2. Atualiza status na tabela principal
      const { error: errInd } = await supabase
        .from('tab_indicacoes')
        .update({ status_indicacao: 'COTADO' })
        .eq('id', selecionada.id);

      if (errInd) throw errInd;

      setSuccessToast("COTAÇÃO ENVIADA COM SUCESSO!");
      setTimeout(() => setSuccessToast(null), 3000);
      setSelecionada(null);
      carregarIndicacoes();
      
      // Limpa formulário
      setFormCotacao({ valor_premio: '', seguradora: '', coberturas_principais: '' });
      setShowSeguradoras(false); // Fecha o dropdown se estiver aberto
    } catch (err: any) { 
      console.error("Erro na cotação:", err);
      alert(`Erro: ${err.message || "Falha na permissão do banco de dados."}`); 
    }
}

  // Função para fechar venda e comissão
  async function finalizarVendaComissao() {
    if (!selecionada || !formComissao.valor_comissao || !formComissao.data_previsao_pagamento) {
      alert("⚠️ Informe o valor da comissão e a data de previsão.");
      return;
    }

    try {
      // TRATAMENTO DE VALOR "BLINDADO":
      // Remove tudo que não é dígito e divide por 100 para converter centavos em float
      // Ex: "R$ 1.250,50" -> "125050" -> 1250.50
      const valorComissaoLimpo = Number(formComissao.valor_comissao.replace(/\D/g, "")) / 100;

      // 1. Atualiza os dados financeiros na cotação
      const { error: errCot } = await supabase
        .from('tab_indicacoes_cotacoes')
        .update({
          comissao_parceiro: valorComissaoLimpo || 0,
          data_previsao_comissao: formComissao.data_previsao_pagamento,
          status_comissao_parceiro: 'PENDENTE' 
        })
        .eq('indicacao_id', selecionada.id);

      if (errCot) throw errCot;

      // 2. Finaliza a indicação com o status correto do banco: 'VENDIDO'
      const { error: errInd } = await supabase
        .from('tab_indicacoes')
        .update({ status_indicacao: 'VENDIDO' })
        .eq('id', selecionada.id);

      if (errInd) throw errInd;

      setSuccessToast("PROPOSTA FINALIZADA E COMISSÃO REGISTRADA!");
      
      // Feedback visual e limpeza de estados
      setTimeout(() => setSuccessToast(null), 3000);
      setShowComissaoModal(false);
      setSelecionada(null);
      carregarIndicacoes();
      
    } catch (err: any) {
      console.error("Erro ao finalizar:", err);
      alert(`Erro ao salvar: ${err.message || "Verifique as permissões do banco."}`);
    }
}

  // Função para processar a recusa do lead
  async function confirmarRecusa() {
    if (!selecionada || !formRecusa.motivo) {
      alert("⚠️ Por favor, selecione o motivo da recusa.");
      return;
    }

    try {
      setLoading(true);
      
      // Monta o texto do motivo: "MOTIVO - Observação"
      const motivoCompleto = formRecusa.observacao 
        ? `${formRecusa.motivo}: ${formRecusa.observacao}`
        : formRecusa.motivo;

      const { error } = await supabase
        .from('tab_indicacoes')
        .update({ 
          status_indicacao: 'PERDIDO',
          motivo_perda: motivoCompleto 
        })
        .eq('id', selecionada.id);

      if (error) throw error;

      setSuccessToast("INDICAÇÃO RECUSADA E ARQUIVADA.");
      setTimeout(() => setSuccessToast(null), 3000);
      
      // Limpa e fecha tudo
      setShowRecusaModal(false);
      setFormRecusa({ motivo: '', observacao: '' });
      setSelecionada(null);
      carregarIndicacoes();

    } catch (err: any) {
      console.error("Erro ao recusar:", err);
      alert(`Erro ao processar recusa: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const filtrados = indicacoes.filter(i => 
    i.nome_cliente.toLowerCase().includes(busca.toLowerCase()) ||
    i.tab_parceiros?.nome_parceiro?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Toast de Sucesso */}
      {successToast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[300] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-slate-700">
            <CheckCircle2 className="text-emerald-400" size={20} />
            <span className="font-black uppercase text-[10px] tracking-[0.2em]">{successToast}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">
              Triagem <span className="text-blue-600">de Indicações</span>
            </h1>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mt-1">
              Central de Atendimento e Conversão
            </p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            {/* BOTÃO ATUALIZAR */}
            <button 
              onClick={handleRefresh} 
              disabled={loading}
              className="flex items-center gap-2 h-12 px-4 bg-white border-2 border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-500 hover:text-blue-600 hover:border-blue-500 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <RefreshCwIcon size={16} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            {/* BARRA DE BUSCA */}
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="PESQUISAR CLIENTE OU PARCEIRO..." 
                className="w-full h-12 pl-12 pr-4 bg-white border-2 border-slate-200 rounded-2xl text-[11px] font-black uppercase outline-none focus:border-blue-500 transition-all shadow-sm" 
                value={busca} 
                onChange={(e) => setBusca(e.target.value)} 
              />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Listagem Lateral */}
          <div className="lg:col-span-5 space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {loading ? (
              <div className="p-20 text-center animate-pulse text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">Sincronizando Banco de Dados...</div>
            ) : filtrados.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2rem] p-10 text-center">
                <Info className="mx-auto text-slate-300 mb-4" size={32} />
                <p className="text-slate-400 font-black uppercase text-[10px]">Nenhuma indicação encontrada</p>
              </div>
            ) : (
              filtrados.map(ind => (
                <div 
                  key={ind.id} 
                  onClick={() => setSelecionada(ind)} 
                  className={`group cursor-pointer p-5 rounded-[2rem] border-2 transition-all duration-300 ${
                    selecionada?.id === ind.id 
                    ? 'border-blue-500 bg-white shadow-xl translate-x-2' 
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                      ind.status_indicacao === 'VENDIDO' ? 'bg-emerald-500 text-white' : // Adicionado VENDIDO
                      ind.status_indicacao === 'APROVADA_PARCEIRO' ? 'bg-emerald-100 text-emerald-600' :
                      ind.status_indicacao === 'COTADO' ? 'bg-purple-100 text-purple-600' :
                      ind.status_indicacao === 'EM_ATENDIMENTO' ? 'bg-blue-100 text-blue-600' : 
                      ind.status_indicacao === 'NOVO' ? 'bg-orange-100 text-orange-600 animate-pulse' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {ind.status_indicacao.replace('_', ' ')}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400">{format(new Date(ind.created_at), "dd/MM/yyyy")}</span>
                  </div>
                  <h3 className="font-black text-slate-800 uppercase text-sm group-hover:text-blue-600 transition-colors">{ind.nome_cliente}</h3>
                  <div className="flex items-center gap-4 mt-3">
                    <p className="text-[9px] font-black text-slate-500 flex items-center gap-1.5 uppercase">
                      <User size={12} className="text-blue-500"/> {ind.tab_parceiros?.nome_parceiro}
                    </p>
                    <p className="text-[9px] font-black text-slate-400 flex items-center gap-1.5 uppercase">
                      <FileText size={12} /> {ind.produto_interesse}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Painel de Detalhes e Ações */}
          <div className="lg:col-span-7">
            {selecionada ? (
              <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 p-8 sticky top-8 shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
                  <div>
                    <h2 className="text-xl font-black text-slate-800 uppercase italic">Painel de Gestão</h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {selecionada.id.slice(0, 8)}...</p>
                  </div>
                  <button
                    onClick={() => setSelecionada(null)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <XCircle className="text-slate-300 hover:text-red-500" size={24} />
                  </button>
                </div>

                {/* Info do Cliente */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-slate-600">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"><Phone size={14} /></div>
                      <span className="text-xs font-black">{selecionada.telefone_cliente}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"><Mail size={14} /></div>
                      <span className="text-xs font-black lowercase">{selecionada.email_cliente}</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Observações da Indicação</label>
                    <p className="text-[11px] font-bold text-slate-600 italic">"{selecionada.obs_indicacao || 'Sem observações...'}"</p>
                  </div>
                </div>

                {/* SEÇÃO DE DOCUMENTOS ANEXADOS */}
                {selecionada.tab_indicacoes_documentos && selecionada.tab_indicacoes_documentos.length > 0 && (
                  <div className="mb-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <FileText size={14} className="text-blue-500" /> Documentos Enviados pelo Parceiro
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selecionada.tab_indicacoes_documentos.map((doc) => (
                        <a
                          key={doc.id}
                          href={doc.url_arquivo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-blue-500 hover:shadow-lg transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              <FileText size={18} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-800 uppercase truncate max-w-[120px]">
                                {doc.tipo}
                              </p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase">Ver arquivo</p>
                            </div>
                          </div>
                          <div className="text-slate-300 group-hover:text-blue-500">
                            <Info size={16} />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fluxo de Status */}
                <div className="space-y-6">

               {/* EXIBIÇÃO DE DADOS DA COTAÇÃO (Para status avançados) */}
                {(['COTADO', 'APROVADA_PARCEIRO', 'VENDIDO'].includes(selecionada.status_indicacao)) && (
                  <div className="mt-8 p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl space-y-4 animate-in fade-in zoom-in duration-300">
                    <div className="flex items-center gap-2 text-slate-400 mb-2">
                      <FileText size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Resumo da Proposta Enviada</span>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Seguradora escolhida</label>
                        <span className="text-[13px] font-black text-slate-700 uppercase">
                          {selecionada.tab_indicacoes_cotacoes?.[0]?.seguradora || '---'}
                        </span>
                      </div>

                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Valor do Prêmio</label>
                        <span className="text-[15px] font-black text-emerald-600">
                          {/* AQUI A CORREÇÃO: Usamos Number() para garantir que o valor do banco seja lido corretamente */}
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                            Number(selecionada.tab_indicacoes_cotacoes?.[0]?.valor_premio || 0)
                          )}
                        </span>
                      </div>

                      {/* Exibe Comissão apenas se houver valor registrado */}
                      {selecionada.tab_indicacoes_cotacoes?.[0]?.comissao_parceiro !== undefined && (
                        <div className="col-span-2 pt-4 border-t border-slate-200/60">
                          <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Comissão do Parceiro</label>
                          <span className="text-[15px] font-black text-blue-600">
                            {/* AQUI A CORREÇÃO: Mesma lógica de conversão forçada */}
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                              Number(selecionada.tab_indicacoes_cotacoes?.[0]?.comissao_parceiro || 0)
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* CASO: NOVO */}
                {selecionada.status_indicacao === 'NOVO' && (
                  <div className="animate-in fade-in zoom-in duration-300">
                    <div className="bg-orange-50 border-2 border-dashed border-orange-200 p-6 rounded-[2rem] mb-6 flex items-center gap-4">
                      <AlertTriangle className="text-orange-500" size={24} />
                      <p className="text-[10px] font-black text-orange-700 uppercase leading-relaxed">Este lead acabou de chegar. Você precisa assumir o atendimento para liberar as opções de cotação.</p>
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => setShowRecusaModal(true)} className="flex-1 h-16 border-2 border-red-200 text-red-500 rounded-2xl font-black uppercase text-[11px] hover:bg-red-50 transition-all">Recusar Lead</button>
                      <button onClick={() => iniciarAtendimento(selecionada.id)} className="flex-[2] h-16 bg-blue-600 text-white rounded-2xl font-black uppercase text-[11px] hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">Assumir Atendimento</button>
                    </div>
                  </div>
                )}

                {/* CASO: EM ATENDIMENTO */}
                {selecionada.status_indicacao === 'EM_ATENDIMENTO' && (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-2">
                      <FileText size={14} /> Detalhes da Cotação
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* SELETOR DE SEGURADORA ELEGANTE */}
                      <div className="col-span-2 md:col-span-1 relative">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Seguradora (digite para pesquisar)</label>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                            <Search size={16} />
                          </div>
                          <input
                            type="text"
                            className="w-full h-12 pl-12 pr-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none uppercase transition-all"
                            placeholder="Pesquisar seguradora..."
                            value={formCotacao.seguradora}
                            onChange={e => {
                              setFormCotacao({ ...formCotacao, seguradora: e.target.value.toUpperCase() });
                              setShowSeguradoras(true); 
                            }}
                            onFocus={() => setShowSeguradoras(true)}
                          />
                          
                          {/* Menu de Sugestões Flutuante */}
                          {showSeguradoras && formCotacao.seguradora.length > 0 && (
                            <div className="absolute z-[500] w-full mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                              {seguradoras
                                .filter(s => s.nome.toUpperCase().includes(formCotacao.seguradora.toUpperCase()))
                                .map(s => (
                                  <div
                                    key={s.id}
                                    onClick={() => {
                                      setFormCotacao({ ...formCotacao, seguradora: s.nome.toUpperCase() });
                                      setShowSeguradoras(false);
                                    }}
                                    className="px-5 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 flex items-center justify-between group"
                                  >
                                    <span className="text-[11px] font-black text-slate-700 uppercase">{s.nome}</span>
                                    <CheckCircle2 size={14} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="col-span-2 md:col-span-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Valor Prêmio (R$)</label>
                        <input
                          className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                          placeholder="R$ 0,00"
                          value={formCotacao.valor_premio}
                          onChange={e => setFormCotacao({ ...formCotacao, valor_premio: maskCurrency(e.target.value) })}
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Coberturas Principais</label>
                        <textarea
                          className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none h-24 resize-none"
                          placeholder="Descreva as coberturas inclusas..."
                          value={formCotacao.coberturas_principais}
                          onChange={e => setFormCotacao({ ...formCotacao, coberturas_principais: e.target.value })}
                        />
                      </div>
                    </div>

                    <button 
                      onClick={enviarCotacao} 
                      className="w-full h-16 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[11px] hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                      <CheckCircle2 size={18} /> Enviar Cotação para o Parceiro
                    </button>
                  </div>
                )}

                {/* CASO: COTADO */}
                {selecionada.status_indicacao === 'COTADO' && (
                  <div className="bg-purple-50 p-10 rounded-[3rem] border-2 border-dashed border-purple-200 text-center animate-pulse">
                    <Clock size={48} className="text-purple-400 mx-auto mb-6" />
                    <h3 className="text-purple-800 font-black uppercase text-sm mb-2 italic">Aguardando Decisão</h3>
                    <p className="text-[10px] text-purple-600 font-bold uppercase max-w-xs mx-auto">A cotação foi enviada ao parceiro. O sistema aguarda que ele aprove ou recuse a proposta.</p>
                  </div>
                )}

                {/* CASO: APROVADA_PARCEIRO */}
                {(selecionada.status_indicacao === 'APROVADA_PARCEIRO' || selecionada.status_indicacao === 'VENDIDO') && (
                  <div className="space-y-6 animate-in zoom-in duration-500">
                    {/* ... Header de Sucesso ... */}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Botão Vincular no CRM - REESTILIZADO */}
                      <button className="group h-16 bg-blue-50/50 border-2 border-blue-200 text-blue-600 rounded-2xl font-black uppercase text-[11px] hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-300 flex items-center justify-center gap-3 shadow-sm active:scale-95">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                          <UserPlus size={18} />
                        </div>
                        <span>Vincular no CRM</span>
                      </button>

                      {/* Lógica Condicional para o Botão de Comissão */}
                      {selecionada.status_indicacao === 'APROVADA_PARCEIRO' ? (
                        <button 
                          onClick={() => setShowComissaoModal(true)} 
                          className="h-16 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-3 active:scale-95"
                        >
                          <Wallet size={18} className="text-emerald-400" /> 
                          Registrar Comissão
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            const cotacao = selecionada.tab_indicacoes_cotacoes?.[0];
                            setFormComissao({
                              // CORREÇÃO AQUI: Multiplicamos por 100 e garantimos que é um Number
                              valor_comissao: cotacao?.comissao_parceiro 
                                ? maskCurrency((Number(cotacao.comissao_parceiro) * 100).toString()) 
                                : '',
                              data_previsao_pagamento: cotacao?.data_previsao_comissao || ''
                            });
                            setShowComissaoModal(true);
                          }} 
                          className="h-16 bg-amber-500 text-white rounded-2xl font-black uppercase text-[11px] hover:bg-amber-600 transition-all shadow-lg shadow-amber-100 flex items-center justify-center gap-3 active:scale-95"
                        >
                          <DollarSign size={18} /> 
                          Editar Comissão
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* CASO: PERDIDO (Novo tratamento visual) */}
                {selecionada.status_indicacao === 'PERDIDO' && (
                  <div className="bg-red-50 p-8 rounded-[2.5rem] border-2 border-red-100 animate-in fade-in">
                    <div className="flex items-center gap-4 mb-4">
                      <XCircle className="text-red-500" size={32} />
                      <h3 className="text-red-800 font-black uppercase text-lg italic">Lead Perdido / Recusado</h3>
                    </div>
                    <div className="bg-white/50 p-4 rounded-xl">
                      <p className="text-[9px] font-black text-red-400 uppercase mb-1">Motivo Registrado:</p>
                      <p className="text-xs font-bold text-red-700 uppercase">{selecionada.motivo_perda || "NÃO INFORMADO"}</p>
                    </div>
                  </div>
                )}
                </div>
              </div>
            ) : (
              <div className="h-[600px] border-4 border-dashed border-slate-200 rounded-[4rem] flex flex-col items-center justify-center text-slate-300 gap-4">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center"><Info size={32}/></div>
                <p className="font-black uppercase text-[11px] tracking-[0.4em]">Selecione um lead para gerenciar</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL COMISSÃO */}
      {showComissaoModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[400] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-lg p-10 shadow-2xl border border-slate-100 animate-in zoom-in duration-300">
            <div className="text-center mb-8">
               <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <DollarSign size={32} />
               </div>
               <h2 className="text-2xl font-black text-slate-800 uppercase italic">Dados Financeiros</h2>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Defina o pagamento do parceiro</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase mb-2 ml-2 block tracking-widest">Valor da Comissão (R$)</label>
                <div className="relative">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm"></div>
                  <input 
                    type="text" 
                    className="w-full h-16 pl-14 pr-6 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-xl text-slate-800 outline-none focus:border-emerald-500 transition-all" 
                    placeholder="0,00"
                    value={formComissao.valor_comissao} 
                    onChange={e => setFormComissao({...formComissao, valor_comissao: maskCurrency(e.target.value)})}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase mb-2 ml-2 block tracking-widest">Previsão de Pagamento</label>
                <input 
                  type="date" 
                  className="w-full h-16 px-6 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-slate-800 outline-none focus:border-emerald-500 transition-all uppercase" 
                  value={formComissao.data_previsao_pagamento} 
                  onChange={e => setFormComissao({...formComissao, data_previsao_pagamento: e.target.value})} 
                />
              </div>
              
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowComissaoModal(false)} className="flex-1 h-16 font-black uppercase text-[10px] text-slate-400 hover:text-slate-600 transition-colors">Cancelar</button>
                <button 
                  onClick={finalizarVendaComissao} 
                  className="flex-[2] h-16 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[11px] shadow-xl shadow-emerald-100 hover:bg-emerald-600 transition-all"
                >
                  Confirmar e Finalizar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RECUSA (Simplificado para o código não ficar gigante, mas mantendo a lógica) */}
      {showRecusaModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-in fade-in duration-300">
            <h2 className="text-xl font-black text-slate-800 uppercase italic mb-6">Motivo da Recusa</h2>
            <select 
              className="w-full h-14 px-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold mb-4 outline-none focus:border-red-500" 
              value={formRecusa.motivo} 
              onChange={e => setFormRecusa({...formRecusa, motivo: e.target.value})}
            >
              <option value="">SELECIONE O MOTIVO...</option>
              {motivosRecusa.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <textarea 
              className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold h-24 mb-6 outline-none focus:border-red-500" 
              placeholder="OBSERVAÇÕES ADICIONAIS..." 
              value={formRecusa.observacao} 
              onChange={e => setFormRecusa({...formRecusa, observacao: e.target.value})} 
            />
            <div className="flex gap-3">
              <button onClick={() => setShowRecusaModal(false)} className="flex-1 font-black uppercase text-[10px] text-slate-400">Voltar</button>
              {/* Substitua o botão original dentro do Modal Recusa por este: */}
              <button 
                onClick={confirmarRecusa}
                disabled={loading}
                className="flex-[2] h-14 bg-red-500 text-white rounded-xl font-black uppercase text-[10px] hover:bg-red-600 shadow-lg shadow-red-100 disabled:opacity-50"
              >
                {loading ? "Processando..." : "Confirmar Recusa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}