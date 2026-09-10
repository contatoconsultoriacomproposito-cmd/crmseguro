import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { 
  FileText, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ModalFechamento } from '../../propostas/ModalFechamento';
import { ModalExclusaoSegura } from '../../../pages/propostas/ModalExclusaoSegura';
import { sincronizarStatusCliente } from '../../../pages/propostas/sincronizarStatusCliente';
import { formatarDataBR } from '../../../utils/dateUtils';

// Modelos de Cotação Dinâmicos
import ModeloCotacaoAuto from '../../../pages/propostas/modelos/ModeloCotacaoAuto';
import ModeloCotacaoEmpresarial from '../../../pages/propostas/modelos/ModeloCotacaoEmpresarial';
import ModeloCotacaoResidencial from '../../../pages/propostas/modelos/ModeloCotacaoResidencial';
import ModeloCotacaoSaude from '../../../pages/propostas/modelos/ModeloCotacaoSaude';
import ModeloCotacaoVida from '../../../pages/propostas/modelos/ModeloCotacaoVida';
import ModeloCotacaoDental from '../../../pages/propostas/modelos/ModeloCotacaoDental';

interface TabPropostasProps {
  clienteId: string;
  onUpdate?: () => void;
}

export const TabPropostas: React.FC<TabPropostasProps> = ({ clienteId, onUpdate }) => {
  const navigate = useNavigate();
  const [propostas, setPropostas] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Estado da proposta selecionada para visualização do modal de cotação
  const [propostaSelecionada, setPropostaSelecionada] = useState<any | null>(null);

  // Estados dos modais de Status (Vendido / Perdido)
  const [modalStatus, setModalStatus] = useState<{ open: boolean; type: 'VENDIDO' | 'PERDIDO'; proposta: any }>({
    open: false,
    type: 'VENDIDO',
    proposta: null
  });

  // Estado do Modal de Exclusão Segura
  const [modalExclusao, setModalExclusao] = useState<{
    isOpen: boolean;
    proposta: any;
    dadosCriticos: { sinistros: number; comissoes: number; isVendido: boolean };
  }>({
    isOpen: false,
    proposta: null,
    dadosCriticos: { sinistros: 0, comissoes: 0, isVendido: false }
  });

  const fetchPropostas = useCallback(async () => {
    if (!clienteId) return;
    setLoading(true);

    try {
      let query = supabase
        .from('tab_propostas')
        .select(`
          *,
          usuarios_perfis!tab_propostas_corretor_id_fkey (
            nome
          ),
          tab_proposta_opcoes (
            id, 
            ordem_opcao,
            tab_proposta_itens (
              id, 
              numero_cotacao, 
              periodicidade, 
              corretor_id, 
              base_produtos (
                nome
              )
            )
          )
        `)
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });

      const { data: propostasData, error: propostasError } = await query;

      if (propostasError) throw propostasError;

      if (!propostasData || propostasData.length === 0) {
        setPropostas([]);
        setLoading(false);
        return;
      }

      const { data: clienteData } = await supabase
        .from('tab_clientes')
        .select('id, nome_razao_social, tipo_cliente, cpf_cnpj')
        .eq('id', clienteId)
        .single();

      const propostasEnriquecidas = propostasData.map((p: any) => ({
        ...p,
        usuarios_perfis: p.usuarios_perfis, 
        tab_clientes: clienteData || null,
      }));

      setPropostas(propostasEnriquecidas);
    } catch (error) {
      console.error('Erro na busca de propostas do cliente:', error);
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    if (clienteId) {
      fetchPropostas();
    }
  }, [clienteId, fetchPropostas]);

  // Verificação de vínculos críticos antes da exclusão segura
  const executarExclusaoSegura = async (proposta: any) => {
    let totalSinistros = 0;
    let totalComissoes = 0;
    const isVendido = proposta.status?.toLowerCase() === 'vendido';

    try {
      if (isVendido) {
        const { data: opcoes } = await supabase
          .from('tab_proposta_opcoes')
          .select('id')
          .eq('proposta_id', proposta.id);

        const idsDasOpcoes = opcoes?.map(o => o.id) || [];

        if (idsDasOpcoes.length > 0) {
          const { data: itens } = await supabase
            .from('tab_proposta_itens')
            .select('id')
            .in('opcao_id', idsDasOpcoes);

          const idsDosItens = itens?.map(i => i.id) || [];

          if (idsDosItens.length > 0) {
            const [resSinistros, resComissoes] = await Promise.all([
              supabase.from('tab_sinistros').select('id', { count: 'exact' }).in('item_id', idsDosItens),
              supabase.from('tab_comissoes_regras').select('id', { count: 'exact' }).in('item_id', idsDosItens)
            ]);
            totalSinistros = resSinistros.count || 0;
            totalComissoes = resComissoes.count || 0;
          }
        }
      }

      setModalExclusao({
        isOpen: true,
        proposta,
        dadosCriticos: { sinistros: totalSinistros, comissoes: totalComissoes, isVendido }
      });
    } catch (error) {
      console.error('Erro ao verificar vínculos para exclusão:', error);
    }
  };

  const handleConfirmarExclusao = async () => {
    const { proposta } = modalExclusao;
    if (!proposta) return;
    
    try {
      setLoading(true);

      const { error } = await supabase
        .from('tab_propostas')
        .delete()
        .eq('id', proposta.id);

      if (error) throw error;

      if (proposta.cliente_id) {
        await sincronizarStatusCliente(proposta.cliente_id);
      }

      setModalExclusao({ 
        isOpen: false, 
        proposta: null, 
        dadosCriticos: { sinistros: 0, comissoes: 0, isVendido: false } 
      });
      
      await fetchPropostas();
      onUpdate?.();
    } catch (error: any) {
      alert('Erro ao excluir: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const propostaParaModal = useMemo(() => {
    return modalStatus.proposta ? [modalStatus.proposta] : [];
  }, [modalStatus.proposta]);

  return (
    <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-4">
      {/* CABEÇALHO DA ABA */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
        <div>
          <h3 className="text-xs font-black uppercase text-slate-500 dark:text-zinc-400 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" /> Histórico de Propostas e Cotações
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Gerencie e acompanhe as propostas comerciais vinculadas a este cliente.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/propostas/criar?clienteId=${clienteId}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Nova Proposta
        </button>
      </div>

      {/* TABELA DE PROPOSTAS */}
      <div className="rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-800">
              <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400">Proposta</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400">Corretor</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400">Cotações</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400">Produtos</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400">Status</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 text-right">Total</th>
              <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-xs text-slate-400">
                  <Loader2 className="animate-spin mx-auto text-blue-500 mb-2 w-5 h-5" /> Carregando propostas...
                </td>
              </tr>
            ) : propostas.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-xs text-slate-400">
                  Nenhuma proposta encontrada para este cliente.
                </td>
              </tr>
            ) : (
              propostas.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="text-sm font-black text-blue-600 italic">{p.numero_proposta}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Vence: {formatarDataBR(p.data_validade)}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-xs font-medium text-slate-600 dark:text-zinc-300">
                    {p.usuarios_perfis?.nome || 'Não atribuído'}
                  </td>
                  <td className="px-4 py-4">
                    {(() => {
                      const numeros = Array.from(new Set(
                        p.tab_proposta_opcoes?.flatMap((opt: any) => 
                          opt.tab_proposta_itens?.map((i: any) => String(i.numero_cotacao))
                        )
                      )).filter(Boolean) as string[];

                      return (
                        <div className="grid grid-cols-3 gap-1 w-24">
                          {numeros.map((num, index) => (
                            <span 
                              key={index} 
                              className="text-[9px] font-mono bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 text-center rounded p-0.5"
                            >
                              {num}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-4 text-[11px] text-slate-500 dark:text-zinc-400 font-medium max-w-[200px] truncate">
                    {Array.from(new Set(p.tab_proposta_opcoes?.flatMap((opt: any) => opt.tab_proposta_itens?.map((i: any) => i.base_produtos?.nome)))).filter(Boolean).join(', ') || '-'}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                      p.status === 'Vendido' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800' : 
                      p.status === 'Perdido' ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/40 dark:border-red-800' : 
                      'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/40 dark:border-amber-800'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right font-black text-slate-700 dark:text-zinc-200 font-mono text-xs">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.valor_total_proposta || 0)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center gap-2 text-slate-400">
                      <button 
                        type="button" 
                        onClick={() => setModalStatus({ open: true, type: 'VENDIDO', proposta: p })} 
                        className="hover:text-emerald-600 transition-colors"
                        title="Marcar como Vendido"
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setModalStatus({ open: true, type: 'PERDIDO', proposta: p })} 
                        className="hover:text-red-600 transition-colors"
                        title="Marcar como Perdido"
                      >
                        <XCircle size={16} />
                      </button>
                      <div className="w-[1px] bg-slate-200 dark:bg-zinc-700 mx-1"></div>
                      <button 
                        type="button" 
                        onClick={() => setPropostaSelecionada(p)} 
                        className="hover:text-blue-600 transition-colors"
                        title="Visualizar Cotação"
                      >
                        <FileText size={16} />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => navigate(`/propostas/editar/${p.id}`)} 
                        className="hover:text-blue-600 transition-colors"
                        title="Editar Proposta"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        type="button" 
                        onClick={() => executarExclusaoSegura(p)} 
                        className="hover:text-red-500 transition-colors"
                        title="Excluir Proposta"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- MODAIS DE SUPORTE --- */}
      <ModalFechamento 
        isOpen={modalStatus.open}
        tipo={modalStatus.type}
        proposta={propostaParaModal} 
        onClose={() => setModalStatus(prev => ({ ...prev, open: false }))}
        onSuccess={async () => {
          setModalStatus(prev => ({ ...prev, open: false }));
          await fetchPropostas();
          onUpdate?.();
        }}
      />

      <ModalExclusaoSegura 
        isOpen={modalExclusao.isOpen}
        onClose={() => setModalExclusao({ ...modalExclusao, isOpen: false })}
        onConfirm={handleConfirmarExclusao}
        clienteId={modalExclusao.proposta?.cliente_id} 
        dadosCriticos={modalExclusao.dadosCriticos}
      />

      {/* --- MODAL DE COTAÇÃO DINÂMICO POR TIPO DE PRODUTO --- */}
      {propostaSelecionada && (() => {
        const isEmpresarial = propostaSelecionada.tab_proposta_opcoes?.some((opt: any) => 
          opt.tab_proposta_itens?.some((item: any) => 
            item.base_produtos?.nome?.toLowerCase().includes('empresarial')
          )
        );

        const isResidencial = propostaSelecionada.tab_proposta_opcoes?.some((opt: any) => 
          opt.tab_proposta_itens?.some((item: any) => 
            item.base_produtos?.nome?.toLowerCase().includes('residencial')
          )
        );

        const isSaude = propostaSelecionada.tab_proposta_opcoes?.some((opt: any) => 
          opt.tab_proposta_itens?.some((item: any) => {
            const nomeProd = item.base_produtos?.nome?.toLowerCase() || '';
            return nomeProd.includes('saúde') || nomeProd.includes('saude');
          })
        );

        const isDental = propostaSelecionada.tab_proposta_opcoes?.some((opt: any) => 
          opt.tab_proposta_itens?.some((item: any) => {
            const nomeProd = item.base_produtos?.nome?.toLowerCase() || '';
            return nomeProd.includes('odonto') || nomeProd.includes('dental') || nomeProd.includes('dentária') || nomeProd.includes('dentaria');
          })
        );

        const isVida = propostaSelecionada.tab_proposta_opcoes?.some((opt: any) => 
          opt.tab_proposta_itens?.some((item: any) => 
            item.base_produtos?.nome?.toLowerCase().includes('vida')
          )
        );

        if (isEmpresarial) {
          return <ModeloCotacaoEmpresarial propostaId={propostaSelecionada.id} onClose={() => setPropostaSelecionada(null)} />;
        }
        if (isResidencial) {
          return <ModeloCotacaoResidencial propostaId={propostaSelecionada.id} onClose={() => setPropostaSelecionada(null)} />;
        }
        if (isSaude) {
          return <ModeloCotacaoSaude propostaId={propostaSelecionada.id} onClose={() => setPropostaSelecionada(null)} />;
        }
        if (isDental) {
          return <ModeloCotacaoDental propostaId={propostaSelecionada.id} onClose={() => setPropostaSelecionada(null)} />;
        }
        if (isVida) {
          return <ModeloCotacaoVida propostaId={propostaSelecionada.id} onClose={() => setPropostaSelecionada(null)} />;
        }

        return <ModeloCotacaoAuto propostaId={propostaSelecionada.id} onClose={() => setPropostaSelecionada(null)} />;
      })()}
    </div>
  );
};