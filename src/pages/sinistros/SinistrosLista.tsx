import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { formatarDataBR } from '../../utils/dateUtils';
import { Search, ExternalLink, User, Briefcase, Hash, Trash2, AlertTriangle } from 'lucide-react';
import { ModalGerenciamentoSinistro } from '../../components/kanban/components_visual_card/ModalGerenciamentoSinistro';

export const RelatorioSinistros = () => {
  const [sinistros, setSinistros] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [sinistroParaGerenciar, setSinistroParaGerenciar] = useState<string | null>(null);

  // Estados para o Modal de Exclusão Customizado
  const [confirmacaoExclusao, setConfirmacaoExclusao] = useState<{ id: string; nome: string } | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const fetchRelatorio = async () => {
    setCarregando(true);
    try {
      // 1. Pegamos o perfil completo do usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: perfil } = await supabase
        .from('usuarios_perfis')
        .select('id, tipo_usuario, corretora_id')
        .eq('id', user.id)
        .single();

      if (!perfil) return;

      // 2. Montamos a Query base
      let query = supabase
        .from('tab_sinistros')
        .select(`
          id,
          status,
          etapa_atual,
          data_abertura,
          data_conclusao,
          cliente_id,
          corretor_id,
          tab_clientes ( nome ),
          tab_proposta_itens (
            numero_apolice,
            base_produtos ( nome )
          ),
          tab_sinistros_ocorrencias (
            data_ocorrencia
          )
        `);

      // 3. REGRA DE NEGÓCIO: Hierarquia de visualização
      if (perfil.tipo_usuario === 'CORRETOR') {
        // Se for corretor, vê apenas os dele
        query = query.eq('corretor_id', perfil.id);
      } else {
        // Se for ADMIN ou DONO, vê todos da corretora dele
        query = query.eq('corretora_id', perfil.corretora_id);
      }

      const { data: sinistrosData, error: sinistroError } = await query
        .order('data_abertura', { ascending: false });

      if (sinistroError) throw sinistroError;

      // 4. Buscamos nomes dos corretores para o mapa
      const { data: perfisData } = await supabase
        .from('usuarios_perfis')
        .select('id, nome')
        .eq('corretora_id', perfil.corretora_id); // Filtra perfis da mesma corretora

      const corretorMap = Object.fromEntries(perfisData?.map(p => [p.id, p.nome]) || []);

      const dadosCompletos = sinistrosData?.map(s => ({
        ...s,
        corretor_nome: corretorMap[s.corretor_id] || 'Não identificado',
        ultima_ocorrencia: s.tab_sinistros_ocorrencias?.[0]?.data_ocorrencia
      }));

      setSinistros(dadosCompletos || []);
    } catch (err: any) {
      console.error("Erro ao carregar relatório:", err.message);
    } finally {
      setCarregando(false);
    }
  };

  // --- NOVA FUNÇÃO DE EXCLUSÃO (PROCESSAMENTO) ---
  const executarExclusao = async () => {
    if (!confirmacaoExclusao) return;
    
    setExcluindo(true);
    try {
      const { error } = await supabase
        .from('tab_sinistros')
        .delete()
        .eq('id', confirmacaoExclusao.id);

      if (error) throw error;

      // Remove da lista local para feedback instantâneo
      setSinistros(prev => prev.filter(s => s.id !== confirmacaoExclusao.id));
      setConfirmacaoExclusao(null); // Fecha o modal
    } catch (err: any) {
      console.error("Erro ao excluir sinistro:", err.message);
      alert("Erro ao excluir: " + err.message);
    } finally {
      setExcluindo(false);
    }
  };

  useEffect(() => {
    fetchRelatorio();
  }, []);

  const sinistrosFiltrados = sinistros.filter(s => {
    const termo = busca.toLowerCase();
    return (
      s.tab_clientes?.nome?.toLowerCase().includes(termo) ||
      s.corretor_nome?.toLowerCase().includes(termo) ||
      s.tab_proposta_itens?.base_produtos?.nome?.toLowerCase().includes(termo) ||
      s.tab_proposta_itens?.numero_apolice?.toLowerCase().includes(termo) ||
      s.status?.toLowerCase().includes(termo)
    );
  });

  return (
    <div className="p-6 bg-zinc-50 dark:bg-[#121212] min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-zinc-800 dark:text-white uppercase tracking-tighter">
            Central de Sinistros e Assistências
          </h1>
          <p className="text-sm text-zinc-500 font-medium italic">Acompanhamento e gestão global de ocorrências</p>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar por cliente, corretor ou apólice..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-[32px] border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Cliente / Corretor</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Produto / Apólice</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Status Operacional</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Cronologia</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {carregando ? (
                <tr><td colSpan={5} className="py-20 text-center text-zinc-400 text-xs font-bold uppercase animate-pulse">Sincronizando base de dados...</td></tr>
              ) : sinistrosFiltrados.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center text-zinc-400 text-xs font-bold uppercase">Nenhum sinistro localizado.</td></tr>
              ) : sinistrosFiltrados.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 font-bold text-sm">
                        <User size={14} className="text-blue-500" />
                        {s.tab_clientes?.nome}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-semibold uppercase">
                        <Briefcase size={12} />
                        Corretor: {s.corretor_nome}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-zinc-700 dark:text-zinc-300">
                        {s.tab_proposta_itens?.base_produtos?.nome || 'Produto não identificado'}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-bold">
                        <Hash size={12} />
                        {s.tab_proposta_itens?.numero_apolice || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                        s.status === 'Encerrado' 
                          ? 'bg-green-100 text-green-600 dark:bg-green-500/10' 
                          : 'bg-amber-100 text-amber-600 dark:bg-amber-500/10'
                      }`}>
                        {s.status}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase italic">
                        {s.etapa_atual}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1 text-[10px] font-bold">
                      <div className="flex justify-between gap-4">
                        <span className="text-zinc-400">Abertura:</span>
                        <span className="text-zinc-700 dark:text-zinc-300">{formatarDataBR(s.data_abertura)}</span>
                      </div>
                      {s.data_conclusao && (
                        <div className="flex justify-between gap-4">
                          <span className="text-green-500">Conclusão:</span>
                          <span className="text-green-600 font-black">{formatarDataBR(s.data_conclusao)}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* BOTÃO DE EXCLUIR QUE ABRE O MODAL */}
                      <button 
                        onClick={() => setConfirmacaoExclusao({ id: s.id, nome: s.tab_clientes?.nome })}
                        className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                        title="Excluir Sinistro"
                      >
                        <Trash2 size={16} />
                      </button>

                      <button 
                        onClick={() => setSinistroParaGerenciar(s.id)}
                        className="p-2.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl hover:scale-105 transition-all shadow-md group-hover:shadow-blue-500/10"
                        title="Gerenciar Sinistro"
                      >
                        <ExternalLink size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL DE CONFIRMAÇÃO DE EXCLUSÃO CUSTOMIZADO --- */}
      {confirmacaoExclusao && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black text-zinc-800 dark:text-white uppercase italic tracking-tighter mb-2">
                Confirmar Exclusão
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                Deseja realmente remover o sinistro de <br/>
                <strong className="text-zinc-800 dark:text-zinc-200 uppercase">{confirmacaoExclusao.nome}</strong>?<br/>
                <span className="text-[10px] text-red-500 font-bold uppercase mt-2 block italic">* Esta ação é irreversível</span>
              </p>
            </div>
            
            <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 flex gap-3">
              <button 
                onClick={() => setConfirmacaoExclusao(null)}
                className="flex-1 py-3 px-4 rounded-2xl text-sm font-bold text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={executarExclusao}
                disabled={excluindo}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-2xl text-sm font-black uppercase tracking-wider shadow-lg shadow-red-200 dark:shadow-none hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"
              >
                {excluindo ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE GERENCIAMENTO (KANBAN) */}
      {sinistroParaGerenciar && (
        <ModalGerenciamentoSinistro
          sinistroId={sinistroParaGerenciar}
          onClose={() => setSinistroParaGerenciar(null)}
          onSuccess={() => {
            fetchRelatorio();
            setSinistroParaGerenciar(null);
          }}
        />
      )}
    </div>
  );
};