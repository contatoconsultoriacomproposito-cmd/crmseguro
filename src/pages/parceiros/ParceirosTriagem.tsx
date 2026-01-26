import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient'; 
import { toast } from 'sonner';
import { FiltroBusca } from '../parceiros/components/FiltroBusca';
import { IndicacaoCard } from '../parceiros/components/IndicacaoCard';
import { PainelAcoes } from '../parceiros/components/PainelAcoes';
import { ModalRecusa } from '../parceiros/components/ModalRecusa';
import { ModalVinculoCRM } from '../parceiros/components/ModalVinculoCRM';
import { useAuth } from '../../auth/AuthContext';

export default function ParceirosTriagem() {
  const { userProfile } = useAuth();

  // --- ESTADOS PRINCIPAIS ---
  const [indicacoes, setIndicacoes] = useState<any[]>([]);
  const [selecionada, setSelecionada] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  // --- ESTADOS DOS MODAIS/FORMS ---
  const [showRecusaModal, setShowRecusaModal] = useState(false);
  const [showVinculoModal, setShowVinculoModal] = useState(false);
  const [modoCotacao, setModoCotacao] = useState(false);
  const [formRecusa, setFormRecusa] = useState({ motivo: '', observacao: '' });

  // --- ESTADOS CRM ---
  const [buscaClienteCRM, setBuscaClienteCRM] = useState('');
  const [clientesEncontrados, setClientesEncontrados] = useState<any[]>([]);
  const [buscandoCRM, setBuscandoCRM] = useState(false);

  const motivosRecusa = [
    "CLIENTE NÃO ATENDE", "FORA DA ÁREA DE COBERTURA",
    "REPROVADO NA ANÁLISE TÉCNICA", "DESISTÊNCIA DO CLIENTE", "OUTROS"
  ];

  const [refreshKey, setRefreshKey] = useState(0);

  // --- LÓGICA DE CARREGAMENTO ---
  const carregarIndicacoes = useCallback(async () => {
    if (!userProfile?.corretora_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tab_indicacoes')
        .select(`
          *, 
          tab_parceiros(nome_parceiro), 
          tab_indicacoes_cotacoes(*)
        `)
        .eq('corretora_id', userProfile.corretora_id)
        .order('created_at', { ascending: false })
        .order('data_envio', { foreignTable: 'tab_indicacoes_cotacoes', ascending: false });

      if (error) throw error;
      setIndicacoes(data || []);
      
      if (selecionada) {
        const atualizada = data?.find(i => i.id === selecionada.id);
        if (atualizada) setSelecionada(atualizada);
      }
    
      setRefreshKey(prev => prev + 1); 
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [selecionada, userProfile?.corretora_id]);

  useEffect(() => { 
    if (userProfile?.corretora_id) {
      carregarIndicacoes(); 
    }
  }, [userProfile?.corretora_id, carregarIndicacoes]);

  const maskCurrency = (value: string) => {
    const n = value.replace(/\D/g, '');
    return (Number(n) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  };

  // --- AÇÕES DE BANCO ---
  const atualizarStatus = async (status: string, extraData = {}) => {
    try {
      setLoading(true);
      const dadosParaAtualizar = { status_indicacao: status, ...extraData };
      
      const { error } = await supabase
        .from('tab_indicacoes')
        .update(dadosParaAtualizar)
        .eq('id', selecionada.id)
        .eq('corretora_id', userProfile?.corretora_id);

      if (error) throw error;

      toast.success(`Operação realizada com sucesso!`);

      setSelecionada((prev: any) => ({
        ...prev,
        ...dadosParaAtualizar
      }));

      await carregarIndicacoes(); 
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const enviarDadosCotacao = async (dados: any) => {
    try {
      setLoading(true);
      const valorLimpo = typeof dados.valor_premio === 'string' 
        ? dados.valor_premio.replace(/\./g, '').replace(',', '.') 
        : dados.valor_premio;
      
      const valorNumerico = parseFloat(valorLimpo);

      const { error: errorCotacao } = await supabase
        .from('tab_indicacoes_cotacoes')
        .insert({
          indicacao_id: selecionada.id,
          valor_premio: valorNumerico,
          seguradora: dados.seguradora,
          coberturas_principais: dados.coberturas_principais,
          url_documento: dados.url_documento,
          status_feedback: 'PENDENTE'
        });

      if (errorCotacao) throw errorCotacao;

      const { error: errorIndicacao } = await supabase
        .from('tab_indicacoes')
        .update({ status_indicacao: 'COTADO' })
        .eq('id', selecionada.id)
        .eq('corretora_id', userProfile?.corretora_id);

      if (errorIndicacao) throw errorIndicacao;

      setModoCotacao(false);
      toast.success("Cotação enviada ao parceiro com sucesso!");
      await carregarIndicacoes();
    } catch (error: any) {
      console.error("Erro detalhado ao salvar cotação:", error);
      toast.error("Erro ao salvar cotação: " + (error.message || "Falha na conexão"));
    } finally {
      setLoading(false);
    }
  };

  const iniciarAtendimento = () => atualizarStatus('EM_ATENDIMENTO');

  const confirmarRecusa = async () => {
    try {
      setLoading(true);
      const dadosParaAtualizar = { 
        status_indicacao: 'PERDIDO', 
        motivo_perda: formRecusa.motivo 
      };
      
      const { error } = await supabase
        .from('tab_indicacoes')
        .update(dadosParaAtualizar)
        .eq('id', selecionada.id)
        .eq('corretora_id', userProfile?.corretora_id);

      if (error) throw error;
      toast.success(`Indicação movida para Perdidos`);

      setSelecionada((prev: any) => ({
        ...prev,
        ...dadosParaAtualizar
      }));

      setShowRecusaModal(false);
      setFormRecusa({ motivo: '', observacao: '' });
      await carregarIndicacoes();
    } catch (error: any) {
      toast.error("Erro ao recusar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const buscarClientesCRM = async (termo: string) => {
    if (!termo || termo.length < 3 || !userProfile?.corretora_id) return;
    setBuscandoCRM(true);
    const { data } = await supabase
      .from('tab_clientes')
      .select('*')
      .eq('corretora_id', userProfile.corretora_id)
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

  const indicacoesFiltradas = indicacoes.filter(i => 
    i.nome_cliente.toLowerCase().includes(busca.toLowerCase()) ||
    i.tab_parceiros?.nome_parceiro?.toLowerCase().includes(busca.toLowerCase())
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
        <aside className="w-full lg:w-[400px] flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
          {indicacoesFiltradas.map(ind => (
            <IndicacaoCard 
              key={ind.id} 
              ind={ind} 
              selecionadaId={selecionada?.id} 
              onClick={(item: any) => {
                setSelecionada(item);
                setBuscaClienteCRM('');
                setClientesEncontrados([]);
                setModoCotacao(false);
              }} 
            />
          ))}
        </aside>

        <main className="flex-1 flex flex-col min-w-0">
          {selecionada ? (
            <PainelAcoes 
              key={`${selecionada.id}-${refreshKey}`}
              indicacao={selecionada}
              loading={loading}
              modoCotacao={modoCotacao}
              maskCurrency={maskCurrency}
              acoes={{
                iniciarAtendimento,
                abrirVinculo: () => setShowVinculoModal(true),
                setModoCotacao,
                setShowRecusaModal,
                setShowComissaoModal: () => {},
                finalizarVendaDireta: () => {},
                enviarDadosCotacao 
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

      <ModalRecusa 
        isOpen={showRecusaModal}
        onClose={() => setShowRecusaModal(false)}
        onConfirm={confirmarRecusa}
        formRecusa={formRecusa}
        setFormRecusa={setFormRecusa}
        motivosRecusa={motivosRecusa}
        loading={loading}
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
        documentoReferencia={selecionada?.documento_cliente}
      />
    </div>
  );
}