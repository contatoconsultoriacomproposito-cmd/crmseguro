import { useState, useEffect } from 'react';
import { Package, Calendar, AlertCircle, DollarSign, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { formatarDataBR } from '../../../utils/dateUtils';
import { ModalAberturaSinistro } from './ModalAberturaSinistro';
import { ModalGerenciamentoSinistro } from './ModalGerenciamentoSinistro';
import { ModalComissoes } from '../components_visual_card/ModalComissoes'; 

export const TabProdutos = ({ clienteId }: { clienteId: string }) => {
  const [produtos, setProdutos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);

  // Estados para controlar os Modais
  const [modalSinistro, setModalSinistro] = useState({ open: false, dados: null as any });
  const [modalGerenciar, setModalGerenciar] = useState({ open: false, sinistroId: '' });
  const [modalComissaoId, setModalComissaoId] = useState<string | null>(null);

  const fetchProdutosVendidos = async () => {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from('tab_proposta_itens')
        .select(`
          id, 
          valor_premio, 
          data_fim_vigencia,
          numero_apolice,
          produto_id,
          base_produtos ( nome ),
          tab_proposta_opcoes!inner (
            tab_propostas!inner ( status, cliente_id )
          ),
          tab_sinistros ( id, status ),
          tab_comissoes ( id, data_recebimento ) 
        `)
        .eq('tab_proposta_opcoes.tab_propostas.cliente_id', clienteId)
        .ilike('tab_proposta_opcoes.tab_propostas.status', 'vendido');

      if (error) throw error;
      setProdutos(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar produtos:", error.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { fetchProdutosVendidos(); }, [clienteId]);

  return (
    <div className="space-y-3">
      {carregando ? (
        <div className="flex items-center justify-center h-20 text-[10px] font-bold text-slate-400 animate-pulse uppercase">
          Carregando produtos...
        </div>
      ) : produtos.length > 0 ? (
        produtos.map((item) => {
          // LÓGICA DE SINISTRO
          const sinistroAtivo = item.tab_sinistros?.find((s: any) => s.status === 'Aberto');

          // LÓGICA DE COMISSÃO
          const comissao = item.tab_comissoes?.[0];
          let btnComissaoProps = {
            label: "Comissão",
            estilo: "bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
            icon: <DollarSign size={14} />
          };

          if (comissao) {
            if (comissao.data_recebimento) {
              btnComissaoProps = {
                label: "Comissão Recebida",
                estilo: "bg-green-500 text-white hover:bg-green-600 shadow-sm",
                icon: <CheckCircle2 size={14} />
              };
            } else {
              btnComissaoProps = {
                label: "Acompanhamento",
                estilo: "bg-amber-500 text-white hover:bg-amber-600 shadow-sm",
                icon: <Clock size={14} />
              };
            }
          }

          return (
            <div key={item.id} className="p-3 bg-white dark:bg-zinc-800 rounded-xl border border-slate-100 dark:border-zinc-700 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col">
                  <span className="font-black text-[11px] text-blue-600 uppercase tracking-tight">
                    {item.base_produtos?.nome}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Calendar size={10} className="text-slate-400" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase">
                      Fim Vigência: {item.data_fim_vigencia ? formatarDataBR(item.data_fim_vigencia) : 'N/D'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ShieldCheck size={10} className="text-slate-400" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                      Apólice: {item.numero_apolice || 'Pendente'}
                    </span>
                  </div>
                </div>
                <span className="font-black text-slate-700 dark:text-zinc-200 text-[11px]">
                  R$ {Number(item.valor_premio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-50 dark:border-zinc-700">
                {/* BOTÃO SINISTRO */}
                {sinistroAtivo ? (
                  <button 
                    onClick={() => setModalGerenciar({ open: true, sinistroId: sinistroAtivo.id })}
                    className="flex items-center justify-center gap-1.5 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-[9px] font-black uppercase"
                  >
                    <Clock size={14} /> Acompanhar
                  </button>
                ) : (
                  <button 
                    onClick={() => setModalSinistro({ 
                      open: true, 
                      dados: {
                        clienteId,
                        produtoId: item.produto_id,
                        nomeProduto: item.base_produtos?.nome,
                        propostaItemId: item.id,
                        numeroApolice: item.numero_apolice
                      }
                    })}
                    className="flex items-center justify-center gap-1.5 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-[9px] font-black uppercase"
                  >
                    <AlertCircle size={14} /> Sinistro/Assistência
                  </button>
                )}
                
                {/* BOTÃO COMISSÃO DINÂMICO */}
                <button 
                  onClick={() => setModalComissaoId(item.id)}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all text-[9px] font-black uppercase ${btnComissaoProps.estilo}`}
                >
                  {btnComissaoProps.icon} {btnComissaoProps.label}
                </button>
              </div>
            </div>
          )
        })
      ) : (
        <div className="py-8 text-center bg-slate-50 dark:bg-zinc-800/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-zinc-700">
          <Package size={20} className="mx-auto mb-2 text-slate-300 opacity-50" />
          <p className="text-[10px] text-slate-400 uppercase font-bold italic">Nenhum produto vendido</p>
        </div>
      )}

      {/* MODAL SINISTRO: ABERTURA */}
      {modalSinistro.open && (
        <ModalAberturaSinistro 
          isOpen={modalSinistro.open}
          onClose={() => setModalSinistro({ open: false, dados: null })}
          onSuccess={() => fetchProdutosVendidos()}
          dados={modalSinistro.dados}
        />
      )}

      {/* MODAL SINISTRO: GERENCIAMENTO */}
      {modalGerenciar.open && (
        <ModalGerenciamentoSinistro 
          sinistroId={modalGerenciar.sinistroId}
          onClose={() => setModalGerenciar({ open: false, sinistroId: '' })}
          onSuccess={() => fetchProdutosVendidos()}
        />
      )}

      {/* MODAL COMISSÕES */}
      {modalComissaoId && (
        <ModalComissoes 
          itemId={modalComissaoId}
          onClose={() => setModalComissaoId(null)}
          onSuccess={() => fetchProdutosVendidos()}
        />
      )}
    </div>
  );
};