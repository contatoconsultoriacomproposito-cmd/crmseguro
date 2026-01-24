import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient'; // Ajuste o caminho conforme seu projeto
import { toast } from 'sonner';
import { FiltroBusca } from '../parceiros/components/FiltroBusca';
import { IndicacaoCard } from '../parceiros/components/IndicacaoCard';
import { PainelAcoes } from '../parceiros/components/PainelAcoes';
import { ModalRecusa } from '../parceiros/components/ModalRecusa';
import { ModalComissao } from '../parceiros/components/ModalComissao';
import { ModalVinculoCRM } from '../parceiros/components/ModalVinculoCRM';

export default function ParceirosTriagem() {
  // --- ESTADOS PRINCIPAIS ---
  const [indicacoes, setIndicacoes] = useState<any[]>([]);
  const [selecionada, setSelecionada] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  // --- ESTADOS DOS MODAIS/FORMS ---
  const [showRecusaModal, setShowRecusaModal] = useState(false);
  const [showComissaoModal, setShowComissaoModal] = useState(false);
  const [showVinculoModal, setShowVinculoModal] = useState(false);
  const [modoCotacao, setModoCotacao] = useState(false);

  const [formRecusa, setFormRecusa] = useState({ motivo: '', observacao: '' });
  const [formComissao, setFormComissao] = useState({ valor_comissao: '', data_previsao_pagamento: '' });
  const [formCotacao, setFormCotacao] = useState({ valor: '', arquivo: null });

  // --- ESTADOS CRM ---
  const [buscaClienteCRM, setBuscaClienteCRM] = useState('');
  const [clientesEncontrados, setClientesEncontrados] = useState<any[]>([]);
  const [buscandoCRM, setBuscandoCRM] = useState(false);

  const motivosRecusa = [
    "CLIENTE NÃO ATENDE", "FORA DA ÁREA DE COBERTURA",
    "REPROVADO NA ANÁLISE TÉCNICA", "DESISTÊNCIA DO CLIENTE", "OUTROS"
  ];

  // --- LÓGICA DE BUSCA E CARREGAMENTO ---
  const carregarIndicacoes = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tab_indicacoes')
        .select('*, tab_parceiros(nome_parceiro), tab_indicacoes_cotacoes(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIndicacoes(data || []);
      
      // Atualiza a selecionada se ela já existir na lista
      if (selecionada) {
        const atualizada = data?.find(i => i.id === selecionada.id);
        if (atualizada) setSelecionada(atualizada);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [selecionada]);

  useEffect(() => { carregarIndicacoes(); }, []);

  // --- AUXILIARES ---
  const maskCurrency = (value: string) => {
    const n = value.replace(/\D/g, '');
    return (Number(n) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  };

  // --- AÇÕES DE BANCO DE DADOS ---
  const atualizarStatus = async (status: string, extraData = {}) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('tab_indicacoes')
        .update({ status_indicacao: status, ...extraData })
        .eq('id', selecionada.id);

      if (error) throw error;
      toast.success(`Status atualizado para ${status}`);
      await carregarIndicacoes();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const iniciarAtendimento = () => atualizarStatus('EM_ATENDIMENTO');

  const confirmarRecusa = async () => {
    await atualizarStatus('RECUSADO', { 
      motivo_recusa: formRecusa.motivo, 
      obs_recusa: formRecusa.observacao,
      data_recusa: new Date().toISOString()
    });
    setShowRecusaModal(false);
  };

  const finalizarVendaComissao = async () => {
    // Lógica para salvar comissão e finalizar
    await atualizarStatus('VENDIDO', {
      valor_comissao_parceiro: parseFloat(formComissao.valor_comissao.replace('.','').replace(',','.')),
      data_previsao_pagamento_comissao: formComissao.data_previsao_pagamento,
      data_venda: new Date().toISOString()
    });
    setShowComissaoModal(false);
  };

  const buscarClientesCRM = async (termo: string) => {
    if (termo.length < 3) return;
    setBuscandoCRM(true);
    const { data } = await supabase
      .from('tab_clientes')
      .select('*')
      .or(`nome.ilike.*${termo}*,cnpj.ilike.*${termo}*,cpf.ilike.*${termo}*`)
      .limit(10);
    setClientesEncontrados(data || []);
    setBuscandoCRM(false);
  };

  const vincularCliente = async (clienteId: string) => {
    await atualizarStatus(selecionada.status_indicacao, { id_cliente_crm: clienteId });
    setShowVinculoModal(false);
    toast.success("Cliente vinculado com sucesso!");
  };

  // --- FILTRAGEM ---
  const indicacoesFiltradas = indicacoes.filter(i => 
    i.nome_cliente.toLowerCase().includes(busca.toLowerCase()) ||
    i.tab_parceiros?.nome_parceiro.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 font-sans">
      
      <FiltroBusca 
        busca={busca} 
        setBusca={setBusca} 
        loading={loading} 
        handleRefresh={carregarIndicacoes} 
      />

      <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-200px)]">
        {/* LISTA LATERAL */}
        <aside className="w-full lg:w-[400px] flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
          {indicacoesFiltradas.map(ind => (
            <IndicacaoCard 
              key={ind.id} 
              ind={ind} 
              selecionadaId={selecionada?.id} 
              onClick={setSelecionada} 
            />
          ))}
        </aside>

        {/* PAINEL DE DETALHES */}
        <main className="flex-1 flex flex-col min-w-0">
          {selecionada ? (
            <PainelAcoes 
              indicacao={selecionada}
              loading={loading}
              modoCotacao={modoCotacao}
              formCotacao={formCotacao}
              setFormCotacao={setFormCotacao}
              maskCurrency={maskCurrency}
              acoes={{
                iniciarAtendimento,
                abrirVinculo: () => setShowVinculoModal(true),
                setModoCotacao,
                setShowRecusaModal,
                setShowComissaoModal,
                finalizarVendaDireta: () => setShowComissaoModal(true)
              }}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-[3.5rem] border-2 border-dashed border-slate-200 text-slate-400">
               <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <span className="text-4xl">👈</span>
               </div>
               <p className="font-black uppercase text-[10px] tracking-[0.3em]">Selecione uma indicação para gerenciar</p>
            </div>
          )}
        </main>
      </div>

      {/* MODAIS MODULARIZADOS */}
      <ModalRecusa 
        isOpen={showRecusaModal}
        onClose={() => setShowRecusaModal(false)}
        onConfirm={confirmarRecusa}
        formRecusa={formRecusa}
        setFormRecusa={setFormRecusa}
        motivosRecusa={motivosRecusa}
        loading={loading}
      />

      <ModalComissao 
        isOpen={showComissaoModal}
        onClose={() => setShowComissaoModal(false)}
        onConfirm={finalizarVendaComissao}
        formComissao={formComissao}
        setFormComissao={setFormComissao}
        maskCurrency={maskCurrency}
      />

      <ModalVinculoCRM 
        isOpen={showVinculoModal}
        onClose={() => setShowVinculoModal(false)}
        buscaClienteCRM={buscaClienteCRM}
        setBuscaClienteCRM={setBuscaClienteCRM}
        buscarClientesCRM={buscarClientesCRM}
        buscandoCRM={buscandoCRM}
        clientesEncontrados={clientesEncontrados}
        vincularCliente={vincularCliente}
      />

    </div>
  );
}