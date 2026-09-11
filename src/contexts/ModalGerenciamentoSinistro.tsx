import { useState, useEffect } from 'react';
import { X, CheckCircle2, Clock, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { formatarDataBR } from '../utils/dateUtils';

interface Props {
  sinistroId?: string;   // ID de tab_sinistros (opcional se for abertura nova)
  clienteId?: string;    // ID de tab_clientes
  itemId?: string;       // ID de tab_proposta_itens (ou produtoId)
  produtoId?: string;    // Alias paraitemId caso seu código antigo envie produtoId
  onClose: () => void;
  onSuccess: () => void;
}

const ETAPAS = ['Abertura', 'Cadastro', 'Avaliação', 'Solução', 'Conclusão'];

export const ModalGerenciamentoSinistro = ({
  sinistroId,
  clienteId,
  itemId,
  produtoId,
  onClose,
  onSuccess,
}: Props) => {
  // Garante que pegamos o ID do item da proposta correto (item_id é o nome da FK na tab_sinistros)
  const itemPropostaId = itemId || produtoId;

  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [currentSinistroId, setCurrentSinistroId] = useState<string | null>(
    sinistroId && sinistroId !== 'undefined' ? sinistroId : null
  );

  const [sinistro, setSinistro] = useState<any>(null);
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);

  const [novaEtapa, setNovaEtapa] = useState('Cadastro');
  const [relato, setRelato] = useState('');
  const [dataRetorno, setDataRetorno] = useState('');
  const [horarioRetorno, setHorarioRetorno] = useState('');

  const carregarDados = async () => {
    setLoading(true);
    setErro(null);

    try {
      let activeSinId = currentSinistroId;

      // 1. Se não recebeu sinistroId direto, verifica se já existe sinistro aberto para este item
      if (!activeSinId && itemPropostaId && itemPropostaId !== 'undefined') {
        const { data: sinExistente } = await supabase
          .from('tab_sinistros')
          .select('id')
          .eq('item_id', itemPropostaId)
          .eq('status', 'Aberto')
          .maybeSingle();

        if (sinExistente) {
          activeSinId = sinExistente.id;
          setCurrentSinistroId(sinExistente.id);
        }
      }

      // 2. Se temos um sinistro id (novo ou existente), carrega os detalhes com as FKs exatas
      if (activeSinId) {
        const { data: sData, error: sError } = await supabase
          .from('tab_sinistros')
          .select(`
            *,
            tab_clientes (
              id,
              nome_razao_social
            ),
            tab_proposta_itens (
              id,
              numero_apolice,
              base_produtos ( nome ),
              tab_proposta_opcoes (
                base_seguradoras ( nome )
              )
            )
          `)
          .eq('id', activeSinId)
          .single();

        if (sError) throw sError;

        setSinistro(sData);
        if (sData.etapa_atual) setNovaEtapa(sData.etapa_atual);

        // Carrega histórico de ocorrências
        const { data: oData, error: oError } = await supabase
          .from('tab_sinistros_ocorrencias')
          .select('*')
          .eq('sinistro_id', activeSinId)
          .order('criado_em', { ascending: false });

        if (oError) throw oError;

        setOcorrencias(oData || []);

        if (oData && oData.length > 0) {
          if (oData[0].data_retorno) setDataRetorno(oData[0].data_retorno);
          if (oData[0].horario_retorno) setHorarioRetorno(oData[0].horario_retorno);
        }
      } else if (itemPropostaId && itemPropostaId !== 'undefined') {
        // Se ainda não existe um registro de sinistro, carrega os dados do item para exibir no topo
        const { data: itemData } = await supabase
          .from('tab_proposta_itens')
          .select(`
            id,
            numero_apolice,
            base_produtos ( nome ),
            tab_proposta_opcoes (
              base_seguradoras ( nome )
            )
          `)
          .eq('id', itemPropostaId)
          .single();

        if (itemData) {
          setSinistro({ tab_proposta_itens: itemData });
        }
      }
    } catch (error: any) {
      console.error('Erro ao carregar sinistro:', error);
      setErro('Erro ao carregar dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [sinistroId, itemPropostaId]);

  const handleSalvarAtualizacao = async () => {
    if (!relato.trim()) {
      setErro('Descreva o relato/atualização do sinistro.');
      return;
    }

    if (['Cadastro', 'Avaliação', 'Solução'].includes(novaEtapa) && !dataRetorno) {
      setErro(`Informe a data de retorno prevista para a etapa de ${novaEtapa}.`);
      return;
    }

    setEnviando(true);
    setErro(null);

    try {
      let targetSinistroId = currentSinistroId;
      const isFinalizando = novaEtapa === 'Conclusão';

      // PASSO 1: Se o sinistro ainda não existir no banco, cria o registro mestre em tab_sinistros
      if (!targetSinistroId) {
        const { data: novoSinistro, error: errCriarSin } = await supabase
          .from('tab_sinistros')
          .insert({
            cliente_id: clienteId && clienteId !== 'undefined' ? clienteId : null,
            item_id: itemPropostaId && itemPropostaId !== 'undefined' ? itemPropostaId : null,
            status: isFinalizando ? 'Encerrado' : 'Aberto',
            etapa_atual: novaEtapa,
            data_abertura: new Date().toISOString(),
            data_conclusao: isFinalizando ? new Date().toISOString() : null,
          })
          .select('id')
          .single();

        if (errCriarSin) throw new Error(`Erro ao registrar sinistro: ${errCriarSin.message}`);

        targetSinistroId = novoSinistro.id;
        setCurrentSinistroId(targetSinistroId);
      } else {
        // PASSO 1B: Se já existe, atualiza a tabela mestre tab_sinistros
        const { error: errSin } = await supabase
          .from('tab_sinistros')
          .update({
            etapa_atual: novaEtapa,
            status: isFinalizando ? 'Encerrado' : 'Aberto',
            data_conclusao: isFinalizando ? new Date().toISOString() : null,
          })
          .eq('id', targetSinistroId);

        if (errSin) throw new Error(`Erro ao atualizar status do sinistro: ${errSin.message}`);
      }

      // PASSO 2: Registra a Ocorrência no Histórico (tab_sinistros_ocorrencias)
      const { error: errOco } = await supabase
        .from('tab_sinistros_ocorrencias')
        .insert({
          sinistro_id: targetSinistroId,
          etapa: novaEtapa,
          relato: relato.trim(),
          data_retorno: isFinalizando ? null : dataRetorno || null,
          horario_retorno: isFinalizando ? null : horarioRetorno || null,
          data_ocorrencia: new Date().toISOString().split('T')[0],
        });

      if (errOco) throw new Error(`Erro ao gravar histórico: ${errOco.message}`);

      // PASSO 3: Atualiza Agenda de Sinistro na tab_clientes
      const targetClienteId = sinistro?.cliente_id || (clienteId !== 'undefined' ? clienteId : null);

      if (targetClienteId) {
        const { error: errCli } = await supabase
          .from('tab_clientes')
          .update({
            data_retorno_sinistro: isFinalizando ? null : dataRetorno || null,
            horario_retorno_sinistro: isFinalizando ? null : horarioRetorno || null,
            atualizado_em: new Date().toISOString(),
          })
          .eq('id', targetClienteId);

        if (errCli) throw new Error(`Erro ao atualizar agenda do cliente: ${errCli.message}`);
      }

      setSalvo(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (error: any) {
      console.error('Erro ao salvar atualização:', error);
      setErro(error.message || 'Erro inesperado ao salvar.');
    } finally {
      setEnviando(false);
    }
  };

  const etapaAtivaIdx = ETAPAS.indexOf(novaEtapa !== '' ? novaEtapa : sinistro?.etapa_atual || 'Cadastro');
  const nomeProduto = sinistro?.tab_proposta_itens?.base_produtos?.nome || 'PRODUTO / ITEM';
  const nomeSeguradora = sinistro?.tab_proposta_itens?.tab_proposta_opcoes?.base_seguradoras?.nome;
  const apolice = sinistro?.tab_proposta_itens?.numero_apolice;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border border-white/20">
        {/* Cabeçalho */}
        <div className="px-8 py-5 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-50 dark:bg-red-950/40 text-red-600 rounded-xl">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">
                Gerenciar Sinistro
              </h2>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                <span className="text-red-600 font-extrabold">{nomeProduto}</span>
                {nomeSeguradora && <span>• {nomeSeguradora}</span>}
                {apolice && <span>• Apólice: {apolice}</span>}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200/50 dark:hover:bg-zinc-700 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {salvo ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={36} />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase">
              Atualização Salva!
            </h3>
            <p className="text-xs text-slate-500 mt-1">Histórico e agenda atualizados com sucesso.</p>
          </div>
        ) : (
          <div className="p-6 md:p-8 overflow-y-auto max-h-[80vh]">
            {erro && (
              <div className="mb-6 bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center gap-3 text-red-600">
                <AlertCircle size={20} className="shrink-0" />
                <p className="text-xs font-bold uppercase">{erro}</p>
              </div>
            )}

            {/* Linha do Tempo (Stepper) */}
            <div className="relative flex justify-between mb-10 px-2">
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 dark:bg-zinc-800 -translate-y-1/2" />
              {ETAPAS.map((step, idx) => {
                const isAtivo = idx <= etapaAtivaIdx;
                const isConcluido = idx < etapaAtivaIdx;
                return (
                  <div key={step} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                        isAtivo
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                          : 'bg-white dark:bg-zinc-900 border-slate-200 text-slate-300'
                      }`}
                    >
                      {isConcluido ? <CheckCircle2 size={16} /> : <span className="text-xs font-black">{idx + 1}</span>}
                    </div>
                    <span
                      className={`absolute -bottom-5 text-[9px] font-black uppercase tracking-tight ${
                        isAtivo ? 'text-blue-600' : 'text-slate-400'
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              {/* Coluna 1: Histórico de Ocorrências */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={14} /> Histórico do Sinistro
                </h3>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1.5 custom-scrollbar">
                  {loading ? (
                    <div className="p-4 text-center text-xs text-slate-400">Carregando histórico...</div>
                  ) : ocorrencias.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl text-slate-400 text-xs italic">
                      Nenhuma ocorrência registrada ainda.
                    </div>
                  ) : (
                    ocorrencias.map((oco) => (
                      <div
                        key={oco.id}
                        className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-2xl border border-slate-100 dark:border-zinc-800"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase">
                            {oco.etapa}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400">
                            {formatarDataBR(oco.criado_em)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700 dark:text-slate-300 italic whitespace-pre-wrap">
                          "{oco.relato}"
                        </p>
                        {oco.data_retorno && (
                          <div className="mt-2 text-[9px] font-bold text-slate-500 flex items-center gap-1">
                            <span>Retorno: {formatarDataBR(oco.data_retorno)}</span>
                            {oco.horario_retorno && <span>às {oco.horario_retorno}</span>}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Coluna 2: Formulário de Nova Ocorrência */}
              <div className="space-y-3 bg-slate-50/80 dark:bg-zinc-800/40 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Etapa Atual:</label>
                  <select
                    value={novaEtapa}
                    onChange={(e) => {
                      setNovaEtapa(e.target.value);
                      setErro(null);
                    }}
                    className="w-full mt-1 p-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ETAPAS.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Data Retorno:</label>
                    <input
                      type="date"
                      value={dataRetorno}
                      disabled={novaEtapa === 'Conclusão'}
                      onChange={(e) => {
                        setDataRetorno(e.target.value);
                        setErro(null);
                      }}
                      className="w-full mt-1 p-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Horário:</label>
                    <input
                      type="time"
                      value={horarioRetorno}
                      disabled={novaEtapa === 'Conclusão'}
                      onChange={(e) => {
                        setHorarioRetorno(e.target.value);
                        setErro(null);
                      }}
                      className="w-full mt-1 p-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Relato / Descrição:</label>
                  <textarea
                    value={relato}
                    onChange={(e) => {
                      setRelato(e.target.value);
                      setErro(null);
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Descreva a atualização ou atitude tomada..."
                    className="w-full mt-1 p-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium h-20 resize-none outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={handleSalvarAtualizacao}
                  disabled={enviando || sinistro?.status === 'Encerrado' && novaEtapa === 'Conclusão'}
                  className="w-full py-3 mt-1 rounded-xl text-xs font-black uppercase bg-slate-900 text-white hover:bg-black transition-all shadow-md disabled:opacity-50"
                >
                  {enviando ? 'Salvando...' : 'Salvar Atualização'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};