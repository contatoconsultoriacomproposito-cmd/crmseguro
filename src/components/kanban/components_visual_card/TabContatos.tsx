import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { 
  Phone, 
  Calendar, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Tag, 
  CheckCircle2, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { ModalAcoesComerciais } from '../../../pages/clientes/ModalAcoesComerciais';
import { salvarAcaoComercialV2 } from '../../../pages/clientes/clienteServiceV2';

interface TabContatosProps {
  clienteId: string;
  corretoraId?: string;
  userId?: string;
  onUpdate?: () => void;
}

export const TabContatos: React.FC<TabContatosProps> = ({
  clienteId,
  onUpdate
}) => {
  const [interacoes, setInteracoes] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [modalAberto, setModalAberto] = useState<boolean>(false);

  const fetchInteracoes = useCallback(async () => {
    if (!clienteId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tab_interacoes_v2')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setInteracoes(data || []);
      setCurrentIndex(0);
    } catch (err) {
      console.error('Erro ao carregar histórico de interações:', err);
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    fetchInteracoes();
  }, [fetchInteracoes]);

  const handleExcluir = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este registro de interação?')) return;
    try {
      const { error } = await supabase
        .from('tab_interacoes_v2')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchInteracoes();
      onUpdate?.(); // Notifica o pai apenas após exclusão bem-sucedida
    } catch (err) {
      console.error('Erro ao excluir interação:', err);
      alert('Erro ao excluir o registro.');
    }
  };

  const currentInteracao = interacoes[currentIndex];
  const totalInteracoes = interacoes.length;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('T')[0].split('-');
    if (!year || !month || !day) return dateStr;
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-4">
      {/* CABEÇALHO E BOTÃO DE INCLUIR */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
        <div>
          <h3 className="text-xs font-black uppercase text-slate-500 dark:text-zinc-400 flex items-center gap-2">
            <Phone className="w-4 h-4 text-blue-600" /> Histórico de Contatos e Interações
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Acompanhe a linha do tempo dos atendimentos realizados com o cliente.</p>
        </div>
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Incluir Contato / Ação
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Carregando histórico...</div>
      ) : totalInteracoes === 0 ? (
        <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
          <FileText className="w-8 h-8 text-slate-300 dark:text-zinc-700" />
          <p className="text-xs font-medium text-slate-400">Nenhum registro de contato encontrado para este cliente.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* BARRA DE NAVEGAÇÃO ENTRE OS HISTÓRICOS */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-zinc-800/50 px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-zinc-300">
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded text-[10px]">
                Registro {currentIndex + 1} de {totalInteracoes}
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                (Mais recente primeiro)
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentIndex >= totalInteracoes - 1}
                onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, totalInteracoes - 1))}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Ver registro anterior (mais antigo)"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </button>

              <button
                type="button"
                disabled={currentIndex <= 0}
                onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Ver próximo registro (mais recente)"
              >
                Próximo <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* CARD DO REGISTRO ATUAL */}
          {currentInteracao && (
            <div className="p-4 bg-slate-50/70 dark:bg-zinc-800/30 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-4 relative">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-zinc-700/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-blue-600 text-white font-black text-[10px] rounded uppercase tracking-wider">
                    {currentInteracao.tipo_acao || 'CONTATO'}
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {formatDate(currentInteracao.data_historico || currentInteracao.criado_em)}
                    {currentInteracao.horario_historico && (
                      <>
                        <Clock className="w-3 h-3 ml-2" /> {String(currentInteracao.horario_historico).substring(0, 5)}
                      </>
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleExcluir(currentInteracao.id)}
                  className="flex items-center gap-1 text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-xs font-bold"
                  title="Excluir este registro"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir Registro
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <span className="block text-[9px] font-black text-slate-400 uppercase mb-0.5">Objetivo da Ação</span>
                  <p className="text-xs font-bold text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 p-2 rounded border border-slate-200 dark:border-zinc-800">
                    {currentInteracao.objetivo_acao || 'Não informado'}
                  </p>
                </div>

                <div>
                  <span className="block text-[9px] font-black text-slate-400 uppercase mb-0.5">Resultado Obtido</span>
                  <p className="text-xs font-bold text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 p-2 rounded border border-slate-200 dark:border-zinc-800">
                    {currentInteracao.resultado_acao || 'Não informado'}
                  </p>
                </div>

                <div>
                  <span className="block text-[9px] font-black text-slate-400 uppercase mb-0.5">Status Agendamento</span>
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 p-2 rounded border border-slate-200 dark:border-zinc-800">
                    {currentInteracao.status_agendamento === 'PENDENTE' ? (
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                    <span>{currentInteracao.status_agendamento || 'PENDENTE'}</span>
                  </div>
                </div>
              </div>

              <div>
                <span className="block text-[9px] font-black text-slate-400 uppercase mb-0.5">Relato do Atendimento</span>
                <div className="p-3 bg-white dark:bg-zinc-900 rounded border border-slate-200 dark:border-zinc-800 text-xs text-slate-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {currentInteracao.relato || currentInteracao.descricao || 'Nenhum relato preenchido.'}
                </div>
              </div>

              {(currentInteracao.proxima_acao || currentInteracao.data_retorno) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                  <div>
                    <span className="block text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase mb-0.5">Próxima Ação Planejada</span>
                    <p className="text-xs font-bold text-slate-700 dark:text-zinc-200">
                      {currentInteracao.proxima_acao || 'Nenhuma'}
                    </p>
                    {currentInteracao.relato_proxima_acao && (
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                        {currentInteracao.relato_proxima_acao}
                      </p>
                    )}
                  </div>

                  <div>
                    <span className="block text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase mb-0.5">Agendamento de Retorno</span>
                    <p className="text-xs font-bold text-slate-700 dark:text-zinc-200 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      {formatDate(currentInteracao.data_retorno)}
                      {currentInteracao.horario_retorno && (
                        <span className="text-slate-400 font-normal">
                          às {String(currentInteracao.horario_retorno).substring(0, 5)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {Array.isArray(currentInteracao.produtos_interesse) && currentInteracao.produtos_interesse.length > 0 && (
                <div>
                  <span className="block text-[9px] font-black text-slate-400 uppercase mb-1">Produtos de Interesse</span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentInteracao.produtos_interesse.map((prod: string, idx: number) => (
                      <span key={idx} className="flex items-center gap-1 px-2 py-0.5 bg-slate-200/70 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded text-[10px] font-bold">
                        <Tag className="w-3 h-3 text-slate-500" /> {prod}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE AÇÕES COMERCIAIS PARA INCLUSÃO */}
      {modalAberto && (
        <ModalAcoesComerciais
          isOpen={modalAberto}
          lead={{ id: clienteId }}
          onClose={() => setModalAberto(false)}
          onSave={async (dadosAcao) => {
            await salvarAcaoComercialV2({
              ...dadosAcao,
              cliente_id: clienteId
            });
            await fetchInteracoes();
            setModalAberto(false);
            onUpdate?.(); // Notifica o pai apenas após salvar com sucesso
          }}
        />
      )}
    </div>
  );
};