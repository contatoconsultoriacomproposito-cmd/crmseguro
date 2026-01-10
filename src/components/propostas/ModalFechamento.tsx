import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { X, CheckCircle, XCircle, Loader2, Calendar, Hash } from "lucide-react";
import { sincronizarStatusCliente } from "../../pages/propostas/sincronizarStatusCliente";

interface ModalFechamentoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  proposta: any | any[] | null;
  tipo: 'VENDIDO' | 'PERDIDO';
}

export function ModalFechamento({ isOpen, onClose, onSuccess, proposta, tipo: type }: ModalFechamentoProps) {
  const [loading, setLoading] = useState(false);
  const [propostaSelecionada, setPropostaSelecionada] = useState<any>(null);
  const [itensProposta, setItensProposta] = useState<any[]>([]);
  
  // ESTADO DO FORMULÁRIO: Adicionada dataVenda iniciando com a data atual (formato YYYY-MM-DD)
  const [form, setForm] = useState({ 
    motivoPerda: "", 
    observacoes: "",
    dataVenda: new Date().toLocaleDateString('en-CA') 
  });
  
  const [dadosItens, setDadosItens] = useState<{ 
    [key: string]: { apolice: string, inicioVigencia: string, fimVigencia: string } 
  }>({});
  const [user, setUser] = useState<any>(null);

  const listaPropostas = Array.isArray(proposta) ? proposta : proposta ? [proposta] : [];

  // FUNÇÃO PARA CORRIGIR O BUG DO ESPAÇO
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ') {
      e.stopPropagation();
    }
  };

  useEffect(() => {
    if (!user) {
      supabase.auth.getUser().then(({ data }) => setUser(data.user));
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && listaPropostas.length > 0) {
      setPropostaSelecionada(listaPropostas[0]);
    }
  }, [isOpen, proposta, listaPropostas]);

  useEffect(() => {
    async function carregarItens() {
      if (!propostaSelecionada?.id || type !== 'VENDIDO') {
        setItensProposta([]);
        return;
      }

      const { data, error } = await supabase
        .from('tab_proposta_opcoes')
        .select(`
          tab_proposta_itens (
            id,
            numero_apolice,
            data_inicio_vigencia,
            data_fim_vigencia,
            base_produtos ( nome )
          )
        `)
        .eq('proposta_id', propostaSelecionada.id);

      if (!error && data) {
        const todosItens = data.flatMap(opt => opt.tab_proposta_itens || []);
        setItensProposta(todosItens);
        
        const inicial: any = {};
        todosItens.forEach(item => {
          inicial[item.id] = { 
            apolice: item.numero_apolice || "", 
            inicioVigencia: item.data_inicio_vigencia || "",
            fimVigencia: item.data_fim_vigencia || ""
          };
        });
        setDadosItens(inicial);
      }
    }
    carregarItens();
  }, [propostaSelecionada, type]);

  const formValido = () => {
    if (type === 'PERDIDO') return form.motivoPerda !== "";
    
    // Validação para venda: exige data da venda e vigências preenchidas
    if (!form.dataVenda) return false;
    if (itensProposta.length === 0) return false;
    
    return itensProposta.every(item => 
      dadosItens[item.id]?.inicioVigencia && 
      dadosItens[item.id]?.fimVigencia
    );
  };

  const handleConfirmar = async () => {
    try {
      setLoading(true);
      const isVendido = type === 'VENDIDO';

      // 1. Atualizar o Status da Proposta e a Data da Venda
      const { error: errorProposta } = await supabase
        .from('tab_propostas')
        .update({
          status: isVendido ? 'Vendido' : 'Perdido',
          motivo_perda: !isVendido ? form.motivoPerda : null,
          observacoes_fechamento: form.observacoes,
          data_venda: isVendido ? form.dataVenda : null, // NOVA COLUNA SENDO ALIMENTADA
          updated_at: new Date().toISOString()
        })
        .eq('id', propostaSelecionada.id);

      if (errorProposta) throw errorProposta;

      // 2. Se for Venda, atualizar os itens (Apólice e Vigências)
      if (isVendido && itensProposta.length > 0) {
        for (const item of itensProposta) {
          const { error: errorItem } = await supabase
            .from('tab_proposta_itens')
            .update({ 
              numero_apolice: dadosItens[item.id]?.apolice,
              data_inicio_vigencia: dadosItens[item.id]?.inicioVigencia,
              data_fim_vigencia: dadosItens[item.id]?.fimVigencia
            })
            .eq('id', item.id);
          
          if (errorItem) throw errorItem;
        }
      }

      // 3. Registrar a Interação no Histórico do Cliente
      await supabase.from('tab_interacoes').insert({
        cliente_id: propostaSelecionada.cliente_id,
        corretor_id: propostaSelecionada.corretor_id,
        corretora_id: propostaSelecionada.corretora_id,
        tipo_acao: isVendido ? 'VENDA REALIZADA' : 'PROPOSTA PERDIDA',
        relato: isVendido 
          ? `Venda finalizada. Data da Venda: ${new Date(form.dataVenda).toLocaleDateString('pt-BR')}. Vigências registradas.` 
          : `Perda: ${form.motivoPerda}. Obs: ${form.observacoes}`,
        data_historico: new Date().toLocaleDateString('en-CA'),
        horario_historico: new Date().toLocaleTimeString('pt-BR', { hour12: false })
      });

      // 4. Sincronização automática do Status/Fase do Cliente
      if (propostaSelecionada.cliente_id) {
        await sincronizarStatusCliente(propostaSelecionada.cliente_id);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao fechar venda/perda:", error);
      alert("Erro ao salvar dados.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !propostaSelecionada) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[999] p-4">
      <div className="bg-white rounded-[32px] w-full max-w-lg p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className={`absolute top-0 left-0 w-full h-2 ${type === 'VENDIDO' ? 'bg-emerald-500' : 'bg-red-500'}`} />
        
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>

        <div className="mb-6 text-center">
          <div className="flex justify-center mb-2">
            {type === 'VENDIDO' ? <CheckCircle className="text-emerald-500" size={40} /> : <XCircle className="text-red-500" size={40} />}
          </div>
          <h3 className="text-xl font-black italic uppercase text-slate-800">
            {type === 'VENDIDO' ? 'Finalizar Venda' : 'Registrar Perda'}
          </h3>
        </div>

        <div className="space-y-6">
          {/* CAMPO DATA DA VENDA - Exclusivo para Fechamento Positivo */}
          {type === 'VENDIDO' && (
            <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100">
              <label className="block text-[10px] font-black uppercase text-blue-600 mb-2">Data da Venda *</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-4 top-3 text-blue-500" />
                <input 
                  type="date"
                  onKeyDown={handleKeyDown}
                  className="w-full h-11 pl-12 pr-4 rounded-xl border border-blue-200 outline-none font-bold text-slate-700"
                  value={form.dataVenda}
                  onChange={(e) => setForm({...form, dataVenda: e.target.value})}
                />
              </div>
            </div>
          )}

          {type === 'VENDIDO' && itensProposta.map((item) => (
            <div key={item.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-xs font-black uppercase text-emerald-600">
                  {item.base_produtos?.nome}
                </span>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Nº Apólice (Opcional)</label>
                  <div className="relative">
                    <Hash size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input 
                      type="text"
                      onKeyDown={handleKeyDown}
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="Número da apólice"
                      value={dadosItens[item.id]?.apolice || ""}
                      onChange={(e) => setDadosItens({...dadosItens, [item.id]: { ...dadosItens[item.id], apolice: e.target.value }})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Início Vigência *</label>
                    <div className="relative">
                      <Calendar size={14} className="absolute left-3 top-3 text-slate-400" />
                      <input 
                        type="date"
                        onKeyDown={handleKeyDown}
                        className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm outline-none"
                        value={dadosItens[item.id]?.inicioVigencia || ""}
                        onChange={(e) => setDadosItens({...dadosItens, [item.id]: { ...dadosItens[item.id], inicioVigencia: e.target.value }})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Fim Vigência *</label>
                    <div className="relative">
                      <Calendar size={14} className="absolute left-3 top-3 text-emerald-500" />
                      <input 
                        type="date"
                        onKeyDown={handleKeyDown}
                        className="w-full h-10 pl-9 pr-3 rounded-lg border border-emerald-200 bg-emerald-50/30 text-sm outline-none font-bold"
                        value={dadosItens[item.id]?.fimVigencia || ""}
                        onChange={(e) => setDadosItens({...dadosItens, [item.id]: { ...dadosItens[item.id], fimVigencia: e.target.value }})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {type === 'PERDIDO' && (
            <div className="p-5 bg-red-50 rounded-2xl border border-red-100">
              <label className="block text-[10px] font-black uppercase text-red-400 mb-2">Motivo da Perda</label>
              <select 
                onKeyDown={handleKeyDown}
                className="w-full h-12 px-4 rounded-xl border border-slate-200 outline-none bg-white font-bold"
                value={form.motivoPerda}
                onChange={(e) => setForm({...form, motivoPerda: e.target.value})}
              >
                <option value="">Selecione...</option>
                <option value="Preço">Preço</option>
                <option value="Concorrência">Concorrência</option>
                <option value="Desistência">Desistência</option>
              </select>
            </div>
          )}
          
          <div className="px-1">
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Observações</label>
            <textarea 
              onKeyDown={handleKeyDown}
              rows={2}
              className="w-full p-4 rounded-xl border border-slate-200 outline-none text-sm resize-none"
              placeholder="Notas sobre o fechamento..."
              value={form.observacoes}
              onChange={(e) => setForm({...form, observacoes: e.target.value})}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button type="button" onClick={onClose} className="flex-1 h-12 font-bold text-slate-400 hover:bg-slate-50 rounded-xl transition-all">Cancelar</button>
          <button 
            type="button"
            disabled={loading || !user || !formValido()}
            onClick={handleConfirmar} 
            className={`flex-1 h-12 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all 
              ${type === 'VENDIDO' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'} 
              ${(loading || !formValido()) && 'opacity-20 grayscale cursor-not-allowed'}`}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}