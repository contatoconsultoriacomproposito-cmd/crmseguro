import { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  MessageSquare, 
  Calendar, 
  Plus // Corrigido: Adicionado o import do Plus
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { formatarDataBR } from '../../../utils/dateUtils';
import { ModalGerenciamentoSinistro } from './ModalGerenciamentoSinistro';

export const TabSinistros = ({ clienteId }: { clienteId: string }) => {
  const [sinistros, setSinistros] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  
  // Estado para rastrear qual etapa o usuário clicou em cada sinistro
  const [etapasSelecionadas, setEtapasSelecionadas] = useState<Record<string, string>>({});
  const [sinistroParaGerenciar, setSinistroParaGerenciar] = useState<string | null>(null);

  const getEtapaAtiva = (etapa: string) => {
    const etapas: Record<string, number> = {
      'Abertura': 0,
      'Cadastro': 1,
      'Avaliação': 2,
      'Solução': 3,
      'Conclusão': 4
    };
    return etapas[etapa] ?? 0;
  };

  const fetchSinistros = async () => {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from('tab_sinistros')
        .select(`
          id,
          status,
          etapa_atual,
          data_abertura,
          tab_proposta_itens (
            base_produtos ( nome )
          ),
          tab_sinistros_ocorrencias (
            relato,
            etapa,
            data_ocorrencia,
            criado_em
          )
        `)
        .eq('cliente_id', clienteId)
        .order('data_ocorrencia', { foreignTable: 'tab_sinistros_ocorrencias', ascending: false });

      if (error) throw error;
      
      setSinistros(data || []);

      // Inicializa cada sinistro mostrando sua 'etapa_atual' por padrão
      const iniciais: Record<string, string> = {};
      data?.forEach(s => {
        iniciais[s.id] = s.etapa_atual;
      });
      setEtapasSelecionadas(iniciais);

    } catch (error: any) {
      console.error("Erro ao buscar sinistros:", error.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { fetchSinistros(); }, [clienteId]);

  return (
    <div className="space-y-4">
      {carregando ? (
        <div className="animate-pulse text-[10px] font-bold text-slate-400 text-center uppercase py-4">
          Buscando sinistros...
        </div>
      ) : sinistros.length > 0 ? (
        <>
          {/* LISTAGEM DE CARDS */}
          {sinistros.map((sinistro) => {
            const etapaVisualizada = etapasSelecionadas[sinistro.id] || sinistro.etapa_atual;
            const ocorrenciaExibida = sinistro.tab_sinistros_ocorrencias?.find(
              (o: any) => o.etapa === etapaVisualizada
            ) || sinistro.tab_sinistros_ocorrencias?.[0];

            return (
              <div key={sinistro.id} className="bg-white dark:bg-zinc-800 p-3 rounded-2xl border border-slate-100 dark:border-zinc-700 shadow-sm">
                
                {/* Header do Sinistro */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <AlertCircle size={12} className={sinistro.status === 'Encerrado' ? "text-green-500" : "text-red-500"} />
                      <span className={`text-[10px] font-black uppercase tracking-tighter ${
                        sinistro.status === 'Encerrado' ? "text-green-500" : "text-red-500"
                      }`}>
                        {sinistro.status === 'Encerrado' ? "Sinistro Finalizado" : "Sinistro Ativo"}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-white">
                      {sinistro.tab_proposta_itens?.base_produtos?.nome || 'Produto não identificado'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                      sinistro.status === 'Aberto' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'
                    }`}>
                      {sinistro.status}
                    </span>
                    <span className="text-[8px] text-slate-400 font-bold mt-1">
                      Aberto em: {formatarDataBR(sinistro.data_abertura)}
                    </span>
                  </div>
                </div>

                {/* Step Bar Visual Interativa */}
                <div className="relative flex justify-between mb-8 px-2 mt-2">
                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 dark:bg-zinc-700 -translate-y-1/2" />
                  {['Abertura','Cadastro', 'Avaliação', 'Solução', 'Conclusão'].map((step, idx) => {
                    const etapaAtualIndex = getEtapaAtiva(sinistro.etapa_atual);
                    const isAtivo = idx <= etapaAtualIndex;
                    const isConcluido = idx < etapaAtualIndex;
                    const isSelecionado = etapaVisualizada === step;
                    
                    return (
                      <button 
                        key={step} 
                        onClick={() => setEtapasSelecionadas(prev => ({ ...prev, [sinistro.id]: step }))}
                        className="relative z-10 flex flex-col items-center group outline-none"
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                          isSelecionado 
                            ? 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-50 dark:ring-blue-900/20 shadow-md' 
                            : isAtivo 
                              ? 'bg-white dark:bg-zinc-800 border-blue-600 text-blue-600' 
                              : 'bg-white dark:bg-zinc-800 border-slate-200 text-slate-300'
                        }`}>
                          {isConcluido ? <CheckCircle2 size={14} /> : <span className="text-[10px] font-black">{idx + 1}</span>}
                        </div>
                        <span className={`absolute -bottom-5 text-[8px] font-black uppercase whitespace-nowrap transition-colors ${
                          isSelecionado ? 'text-blue-600' : isAtivo ? 'text-slate-500' : 'text-slate-300'
                        }`}>
                          {step}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Box de Detalhes da Etapa (Dinâmico) */}
                <div className="mt-2 p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-xl border border-slate-100 dark:border-zinc-700 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                      <MessageSquare size={12} className="text-blue-500" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                        {etapaVisualizada === sinistro.etapa_atual ? "Status Atual" : `Registro: ${etapaVisualizada}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <Calendar size={10} />
                      <span className="text-[9px] font-bold">
                         {ocorrenciaExibida 
                          ? formatarDataBR(ocorrenciaExibida.data_ocorrencia) 
                          : 'Pendente'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-zinc-400 italic leading-relaxed">
                    {ocorrenciaExibida 
                      ? `"${ocorrenciaExibida.relato}"` 
                      : "Nenhuma informação registrada para esta etapa."}
                  </p>
                </div>
                
                <button 
                  onClick={() => setSinistroParaGerenciar(sinistro.id)}
                  className="w-full mt-3 py-2.5 bg-slate-900 dark:bg-white dark:text-black text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-800 transition-all"
                >
                  Gerenciar Sinistro
                </button>
              </div>
            );
          })}

          {/* O MODAL FICA AQUI (Fora do map) */}
          {sinistroParaGerenciar && (
            <ModalGerenciamentoSinistro
              sinistroId={sinistroParaGerenciar}
              onClose={() => setSinistroParaGerenciar(null)}
              onSuccess={() => {
                fetchSinistros(); 
                setSinistroParaGerenciar(null);
              }}
            />
          )}

          {/* Botão de abrir novo sinistro */}
          <button className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 dark:border-zinc-700 rounded-2xl text-slate-400 hover:text-blue-500 hover:border-blue-200 transition-all">
            <Plus size={16} />
            <span className="text-[10px] font-black uppercase">Abrir Sinistro Adicional</span>
          </button>
        </>
      ) : (
        <div className="py-10 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 bg-slate-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-3">
            <AlertCircle size={24} className="text-slate-200 dark:text-zinc-600" />
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase max-w-[150px] mx-auto">
            Nenhum sinistro em andamento.
          </p>
        </div>
      )}
    </div>
  );
}; // Chave final fechada corretamente aqui