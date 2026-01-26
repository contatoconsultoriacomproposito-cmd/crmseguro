import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { X, CheckCircle, XCircle, Loader2, Calendar, Hash, MousePointer2 } from "lucide-react";
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
  
  const [form, setForm] = useState({ 
    motivoPerda: "", 
    observacoes: "",
    dataVenda: new Date().toLocaleDateString('en-CA') 
  });
  
  const [dadosItens, setDadosItens] = useState<{ 
    [key: string]: { 
      apolice: string, 
      inicioVigencia: string, 
      fimVigencia: string,
      periodicidade: 'ANUAL' | 'MENSAL' | 'PERSONALIZADO'
    } 
  }>({});
  const [user, setUser] = useState<any>(null);

  const listaPropostas = Array.isArray(proposta) ? proposta : proposta ? [proposta] : [];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ') {
      e.stopPropagation();
    }
  };

  // Função para calcular vigência baseada no botão clicado
  const calcularVigencia = (idItem: string, tipo: 'ANUAL' | 'MENSAL' | 'PERSONALIZADO') => {
    if (!form.dataVenda) {
      alert("Por favor, informe a Data da Venda primeiro.");
      return;
    }

    const dataInicio = form.dataVenda;
    let dataFim = "";

    if (tipo === 'ANUAL') {
      const data = new Date(dataInicio);
      data.setFullYear(data.getFullYear() + 1);
      dataFim = data.toISOString().split('T')[0];
    } else if (tipo === 'MENSAL') {
      dataFim = ""; // Fica vazio e desabilitado
    } else {
      // PERSONALIZADO: Mantém início e deixa fim livre para o usuário
      dataFim = dadosItens[idItem]?.fimVigencia || "";
    }

    setDadosItens(prev => ({
      ...prev,
      [idItem]: {
        ...prev[idItem],
        periodicidade: tipo,
        inicioVigencia: dataInicio,
        fimVigencia: dataFim
      }
    }));
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
          periodicidade,
          base_produtos ( nome )
        )
      `)
      .eq('proposta_id', propostaSelecionada.id);

    if (!error && data) {
      const todosItens = data.flatMap(opt => opt.tab_proposta_itens || []);
      setItensProposta(todosItens);
      
      const inicial: any = {};
      
      // Pegamos a data da venda atual do formulário como âncora
      const dataBase = form.dataVenda; 
      
      // Cálculo padrão para +1 ano (Anual)
      const dataFimPadrao = new Date(dataBase);
      dataFimPadrao.setFullYear(dataFimPadrao.getFullYear() + 1);
      const dataFimFormatada = dataFimPadrao.toISOString().split('T')[0];

      todosItens.forEach(item => {
        // Se o item já tem data no banco, usamos ela. 
        // Caso contrário, forçamos a data da venda para evitar o "bug" visual.
        const temDataNoBanco = item.data_inicio_vigencia && item.data_inicio_vigencia !== "";

        inicial[item.id] = { 
          apolice: item.numero_apolice || "", 
          periodicidade: item.periodicidade || 'ANUAL',
          inicioVigencia: temDataNoBanco ? item.data_inicio_vigencia : dataBase,
          fimVigencia: temDataNoBanco ? item.data_fim_vigencia : dataFimFormatada
        };
      });
      
      setDadosItens(inicial);
    }
  }
  carregarItens();
}, [propostaSelecionada, type]); // Mantemos sem a dependência do form.dataVenda aqui para evitar loops

  // SINCRONIZAÇÃO AUTOMÁTICA: 
// Se o corretor alterar a "Data da Venda", atualizamos as vigências que não são "Personalizadas"
useEffect(() => {
  if (type === 'VENDIDO' && itensProposta.length > 0) {
    setDadosItens(prev => {
      const novoEstado = { ...prev };
      let houveMudanca = false;

      itensProposta.forEach(item => {
        const dados = novoEstado[item.id];
        // Só atualizamos se não for Personalizado e se a data for diferente da base
        if (dados && dados.periodicidade !== 'PERSONALIZADO') {
          const dataInicio = form.dataVenda;
          let dataFim = "";

          if (dados.periodicidade === 'ANUAL') {
            const d = new Date(dataInicio);
            d.setFullYear(d.getFullYear() + 1);
            dataFim = d.toISOString().split('T')[0];
          } else if (dados.periodicidade === 'MENSAL') {
            dataFim = "";
          }

          if (dados.inicioVigencia !== dataInicio || dados.fimVigencia !== dataFim) {
            novoEstado[item.id] = { ...dados, inicioVigencia: dataInicio, fimVigencia: dataFim };
            houveMudanca = true;
          }
        }
      });

      return houveMudanca ? novoEstado : prev;
    });
  }
}, [form.dataVenda, itensProposta]);


  const formValido = () => {
    if (type === 'PERDIDO') return form.motivoPerda !== "";
    if (!form.dataVenda || itensProposta.length === 0) return false;
    
    return itensProposta.every(item => {
      const dados = dadosItens[item.id];
      if (!dados?.inicioVigencia) return false;
      if (dados.periodicidade !== 'MENSAL' && !dados.fimVigencia) return false;
      return true;
    });
  };

  const handleConfirmar = async () => {
    try {
      setLoading(true);
      const isVendido = type === 'VENDIDO';

      const { error: errorProposta } = await supabase
        .from('tab_propostas')
        .update({
          status: isVendido ? 'Vendido' : 'Perdido',
          motivo_perda: !isVendido ? form.motivoPerda : null,
          observacoes_fechamento: form.observacoes,
          data_venda: isVendido ? form.dataVenda : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', propostaSelecionada.id);

      if (errorProposta) throw errorProposta;

      if (isVendido && itensProposta.length > 0) {
        for (const item of itensProposta) {
          const dados = dadosItens[item.id];
          const { error: errorItem } = await supabase
            .from('tab_proposta_itens')
            .update({ 
              numero_apolice: dados?.apolice,
              data_inicio_vigencia: dados?.inicioVigencia,
              data_fim_vigencia: dados?.periodicidade === 'MENSAL' ? null : dados?.fimVigencia,
              periodicidade: dados?.periodicidade,
              data_venda: form.dataVenda
            })
            .eq('id', item.id);
          
          if (errorItem) throw errorItem;
        }
      }

      await supabase.from('tab_interacoes').insert({
        cliente_id: propostaSelecionada.cliente_id,
        corretor_id: propostaSelecionada.corretor_id,
        corretora_id: propostaSelecionada.corretora_id,
        tipo_acao: isVendido ? 'VENDA REALIZADA' : 'PROPOSTA PERDIDA',
        relato: isVendido 
          ? `Venda finalizada. Data da Venda: ${new Date(form.dataVenda).toLocaleDateString('pt-BR')}.` 
          : `Perda: ${form.motivoPerda}. Obs: ${form.observacoes}`,
        data_historico: new Date().toLocaleDateString('en-CA'),
        horario_historico: new Date().toLocaleTimeString('pt-BR', { hour12: false })
      });

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
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-slate-200 pb-3">
                <span className="text-xs font-black uppercase text-emerald-600">{item.base_produtos?.nome}</span>
                
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                  <MousePointer2 size={10} className="text-slate-400 ml-1" />
                  {[
                    { id: 'ANUAL', label: 'Anual', color: 'bg-blue-600' },
                    { id: 'MENSAL', label: 'Mensal', color: 'bg-emerald-600' },
                    { id: 'PERSONALIZADO', label: 'Pers.', color: 'bg-slate-600' }
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => calcularVigencia(item.id, btn.id as any)}
                      className={`px-2 py-1 rounded text-[9px] font-black uppercase transition-all
                        ${dadosItens[item.id]?.periodicidade === btn.id 
                          ? `${btn.color} text-white shadow-sm` 
                          : `text-slate-400 hover:bg-slate-50`}`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
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

                <div>
                  <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Início Vigência *</label>
                  <input 
                    type="date"
                    onKeyDown={handleKeyDown}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm outline-none font-bold"
                    value={dadosItens[item.id]?.inicioVigencia || ""}
                    onChange={(e) => setDadosItens({...dadosItens, [item.id]: { ...dadosItens[item.id], inicioVigencia: e.target.value }})}
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">
                    {dadosItens[item.id]?.periodicidade === 'MENSAL' ? 'Fim (Auto)' : 'Fim Vigência *'}
                  </label>
                  <input 
                    type="date"
                    disabled={dadosItens[item.id]?.periodicidade === 'MENSAL'}
                    onKeyDown={handleKeyDown}
                    className={`w-full h-10 px-3 rounded-lg border text-sm outline-none font-bold transition-all
                      ${dadosItens[item.id]?.periodicidade === 'MENSAL' 
                        ? 'bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed opacity-50' 
                        : 'border-emerald-200 bg-emerald-50/30 text-slate-700'}`}
                    value={dadosItens[item.id]?.fimVigencia || ""}
                    onChange={(e) => setDadosItens({...dadosItens, [item.id]: { ...dadosItens[item.id], fimVigencia: e.target.value }})}
                  />
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
                <option value="Preço">Achou caro</option>
                <option value="Concorrência">Fechou com a concorrência</option>
                <option value="Desistência">Desisitiu do seguro</option>
                <option value="Outros">Outros motivos</option>
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
          <button type="button" onClick={onClose} className="flex-1 h-12 font-bold text-slate-400 hover:bg-slate-50 rounded-xl transition-all text-sm">Cancelar</button>
          <button 
            type="button"
            disabled={loading || !user || !formValido()}
            onClick={handleConfirmar} 
            className={`flex-1 h-12 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all text-sm
              ${type === 'VENDIDO' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'} 
              ${(loading || !formValido()) && 'opacity-20 grayscale cursor-not-allowed'}`}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Confirmar Fechamento'}
          </button>
        </div>
      </div>
    </div>
  );
}