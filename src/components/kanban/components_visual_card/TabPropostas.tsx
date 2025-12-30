import { useState, useEffect } from 'react';
import { Pencil, Trash2, FileText, CheckCircle, XCircle, Plus, Calendar } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { gerarPDFProposta } from '../../../utils/gerarPDF';
import { formatarDataBR } from '../../../utils/dateUtils';
import { ModalFechamento } from '../../propostas/ModalFechamento';

export const TabPropostas = ({ cliente, onUpdate }: { cliente: any, onUpdate: () => void }) => {
  const [propostas, setPropostas] = useState<any[]>([]);
  const [modalStatus, setModalStatus] = useState({ open: false, type: '', proposta: null as any });
  const navigate = useNavigate();

  const fetchPropostas = async () => {
    const { data } = await supabase
      .from('tab_propostas')
      .select('id, numero_proposta, valor_total_proposta, cliente_id, corretor_id, data_validade, status')
      .eq('cliente_id', cliente.id)
      .order('created_at', { ascending: false });
    if (data) setPropostas(data);
  };

  useEffect(() => { fetchPropostas(); }, [cliente.id]);

  const handleGerarPDF = async (prop: any) => {
    try {
      const { data: opcoesDb } = await supabase
        .from('tab_proposta_opcoes')
        .select(`*, base_seguradoras (nome), tab_proposta_itens (*, base_produtos (nome))`)
        .eq('proposta_id', prop.id)
        .order('ordem_opcao', { ascending: true });

      if (!opcoesDb) return;

      const produtosUnicos = Array.from(new Set(
        opcoesDb.flatMap(opt => opt.tab_proposta_itens.map((i: any) => i.base_produtos?.nome || 'Produto'))
      ));

      await gerarPDFProposta({
        numeroProposta: prop.numero_proposta,
        corretorId: prop.corretor_id,
        validade: prop.data_validade,
        cliente: {
          nome: cliente.tipo_cliente === 'PJ' ? cliente.razao_social : cliente.nome,
          documento: cliente.tipo_cliente === 'PJ' ? cliente.cnpj : cliente.cpf,
          whatsapp: cliente.telefone_whats || ''
        },
        produtosUnicos,
        opcoes: opcoesDb.map(opt => ({
          companhia: opt.base_seguradoras?.nome || 'N/A',
          itens: opt.tab_proposta_itens.map((i: any) => ({
            nomeProduto: i.base_produtos?.nome,
            valor: i.valor_premio,
            cobertura: i.coberturas_franquias || '-',
            parcelamento: i.parcelamento || '1x',
            meio: i.meio_pagamento || 'Boleto'
          }))
        }))
      });
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
    }
  };

  const handleExcluir = async (id: string) => {
    if (confirm("Deseja excluir esta proposta?")) {
      await supabase.from('tab_propostas').delete().eq('id', id);
      fetchPropostas();
    }
  };

  return (
    <div className="flex flex-col">
      <div className="space-y-3">
        {propostas.length > 0 ? (
          propostas.map((prop) => (
            <div key={prop.id} className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col">
                  <span className="font-black text-[9px] text-slate-400 uppercase">#{prop.numero_proposta}</span>
                  <span className="font-black text-blue-600 text-sm">
                    R$ {Number(prop.valor_total_proposta || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  
                  {/* EXIBIÇÃO DA VALIDADE USANDO CALENDAR E FORMATARDATABR */}
                  <div className="flex items-center gap-1 mt-1">
                    <Calendar size={10} className="text-slate-400" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase">
                      Válida até: {prop.data_validade ? formatarDataBR(prop.data_validade) : 'N/D'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => navigate(`/propostas/editar/${prop.id}`)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Pencil size={14} /></button>
                  <button onClick={() => handleGerarPDF(prop)} className="p-1.5 text-slate-400 hover:text-green-600 transition-colors"><FileText size={14} /></button>
                  <button onClick={() => handleExcluir(prop.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-50">
                {prop.status?.toLowerCase() === 'vendido' ? (
                  <div className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase">
                    <CheckCircle size={14} /> Vendido
                  </div>
                ) : prop.status?.toLowerCase() === 'perdido' ? (
                  <div className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-red-100 text-red-700 rounded-lg text-[10px] font-black uppercase">
                    <XCircle size={14} /> Perdido
                  </div>
                ) : (
                  <>
                    <button onClick={() => setModalStatus({ open: true, type: 'VENDIDO', proposta: prop })} className="flex-1 py-1.5 bg-green-50 text-green-700 rounded-lg text-[10px] font-black uppercase hover:bg-green-100 transition-colors">Vendido</button>
                    <button onClick={() => setModalStatus({ open: true, type: 'PERDIDO', proposta: prop })} className="flex-1 py-1.5 bg-red-50 text-red-700 rounded-lg text-[10px] font-black uppercase hover:bg-red-100 transition-colors">Perdido</button>
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
            <p className="text-[10px] text-slate-400 uppercase font-bold italic">Nenhuma proposta vinculada</p>
          </div>
        )}
      </div>

      <button
        onClick={() => navigate('/propostas/criar', { state: { clienteId: cliente.id } })}
        className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-white hover:bg-blue-50 text-blue-600 border border-blue-100 rounded-lg transition-all shadow-sm"
      >
        <Plus size={18} strokeWidth={2.5} />
        <span className="text-sm font-bold uppercase">Nova Proposta</span>
      </button>

      {modalStatus.open && (
        <ModalFechamento
          isOpen={modalStatus.open}
          onClose={() => setModalStatus({ ...modalStatus, open: false })}
          tipo={modalStatus.type as 'VENDIDO' | 'PERDIDO'}
          proposta={modalStatus.proposta}
          onSuccess={() => { setModalStatus({ ...modalStatus, open: false }); fetchPropostas(); onUpdate(); }}
        />
      )}
    </div>
  );
};