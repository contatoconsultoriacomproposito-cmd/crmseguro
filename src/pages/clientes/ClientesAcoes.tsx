import { useEffect, useState } from "react";
import { 
  ArrowLeft, Printer, Loader2, 
  Flame, Thermometer, Snowflake, Clock, 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { toast, Toaster } from 'react-hot-toast';
import { format } from "date-fns";

// Bibliotecas de PDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ClientesAcoes() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [relatorioData, setRelatorioData] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  const [filtroTemp, setFiltroTemp] = useState<string>('todos');

  useEffect(() => {
    async function getInitialData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: perfil } = await supabase
          .from('usuarios_perfis')
          .select('id, corretora_id, tipo_usuario, nome')
          .eq('id', user.id)
          .single();
        setUserProfile(perfil);
      }
    }
    getInitialData();
  }, []);

  async function atualizarTemperatura(clienteId: string, novaTemp: string) {
    try {
      // Atualiza na base principal se o cliente for de lá
      await supabase
        .from('tab_clientes')
        .update({ temperatura: novaTemp })
        .eq('id', clienteId);

      // Atualiza o estado visual em memória para dar feedback imediato na tela
      setRelatorioData(prev => prev.map(item => 
        item.id === clienteId 
          ? { ...item, info: { ...item.info, temperatura: novaTemp } }
          : item
      ));
      
      toast.success(`Status atualizado: ${novaTemp}`);
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  }

  async function atualizarDataRetorno(clienteId: string, novaData: string) {
    try {
      // Atualiza na base principal se o cliente for de lá
      await supabase
        .from('tab_clientes')
        .update({ data_retorno: novaData })
        .eq('id', clienteId);

      // Atualiza o estado visual em memória para dar feedback imediato na tela
      setRelatorioData(prev => prev.map(item => 
        item.id === clienteId 
          ? { ...item, info: { ...item.info, data_retorno: novaData } }
          : item
      ));
      
      toast.success("Data de retorno atualizada");
    } catch (error) {
      toast.error("Erro ao atualizar data");
    }
  }

  async function carregarRelatorio() {
    if (!userProfile?.corretora_id) return;
    setLoading(true);
    try {
      // 1) Busca de interações padrão (Base Principal - Clientes Antigos / Convertidos)
      let queryInteracoes = supabase
        .from('tab_interacoes')
        .select(`
          *,
          cliente:tab_clientes (
            id, nome, razao_social, temperatura, data_retorno, horario_retorno
          )
        `)
        .eq('corretora_id', userProfile.corretora_id)
        .gte('data_historico', dataInicio)
        .lte('data_historico', dataFim);

      if (userProfile.tipo_usuario === 'CORRETOR') {
        queryInteracoes = queryInteracoes.eq('corretor_id', userProfile.id);
      }

      // 2) Busca de Clientes Frios (Tabela de Prospecção) com colunas reais existentes
      let queryClientesFrios = supabase
        .from('tab_clientes_frios')
        .select('id, razao_social, nome_fantasia, corretora_id, corretor_id');

      if (userProfile.tipo_usuario === 'CORRETOR') {
        queryClientesFrios = queryClientesFrios.eq('corretor_id', userProfile.id);
      } else {
        queryClientesFrios = queryClientesFrios.eq('corretora_id', userProfile.corretora_id);
      }

      // 3) Busca de Ações Frias usando a coluna de data correta 'criado_em'
      let queryAcoesFrias = supabase
        .from('tab_clientes_frios_acoes')
        .select('*')
        .gte('criado_em', `${dataInicio}T00:00:00`)
        .lte('criado_em', `${dataFim}T23:59:59`);

      if (userProfile.tipo_usuario === 'CORRETOR') {
        queryAcoesFrias = queryAcoesFrias.eq('corretor_id', userProfile.id);
      }

      const [resInteracoes, resClientesFrios, resAcoesFrias] = await Promise.all([
        queryInteracoes.order('data_historico', { ascending: false }),
        queryClientesFrios,
        queryAcoesFrias.order('criado_em', { ascending: false })
      ]);

      if (resInteracoes.error) throw resInteracoes.error;
      if (resClientesFrios.error) throw resClientesFrios.error;
      if (resAcoesFrias.error) throw resAcoesFrias.error;

      const agrupado: any = {};

      // Mapeia Interações da Base Principal (Clientes Convertidos)
      resInteracoes.data?.forEach((item: any) => {
        const clienteId = item.cliente_id;
        if (!item.cliente) return;
        const tempCliente = item.cliente?.temperatura || 'morno';
        if (filtroTemp !== 'todos' && tempCliente !== filtroTemp) return;

        if (!agrupado[clienteId]) {
          agrupado[clienteId] = { id: clienteId, info: item.cliente, acoes: [] };
        }
        agrupado[clienteId].acoes.push(item);
      });

      // Indexa os Clientes Frios para cruzamento rápido em memória
      const clientesFriosMap = new Map<string, any>();
      resClientesFrios.data?.forEach((c: any) => {
        clientesFriosMap.set(c.id, c);
      });

      // Cruza as Ações Frias mapeando com as colunas reais da Prospecção
      resAcoesFrias.data?.forEach((item: any) => {
        const clienteId = item.cliente_frio_id;
        if (!clienteId) return;

        const cFrio = clientesFriosMap.get(clienteId);
        if (!cFrio) return; 

        // Como pertencem à tabela de Prospecção Fria, a temperatura base padrão é 'frio'
        const tempCliente = 'frio';
        if (filtroTemp !== 'todos' && tempCliente !== filtroTemp) return;

        if (!agrupado[clienteId]) {
          agrupado[clienteId] = {
            id: clienteId,
            info: {
              id: cFrio.id,
              nome: cFrio.nome_fantasia || cFrio.razao_social || 'Sem Nome',
              razao_social: cFrio.razao_social || '',
              temperatura: tempCliente,
              data_retorno: item.data_retorno || '', // Resgata da ação de prospecção fria
              horario_retorno: ''
            },
            acoes: []
          };
        } else {
          // Se a ação atual do loop possuir uma data de retorno mais recente, atualiza a info de exibição
          if (item.data_retorno && (!agrupado[clienteId].info.data_retorno || item.data_retorno > agrupado[clienteId].info.data_retorno)) {
            agrupado[clienteId].info.data_retorno = item.data_retorno;
          }
        }

        // Isola o timestamp criado_em em YYYY-MM-DD para uniformizar a ordenação
        const dataAcao = item.criado_em ? item.criado_em.split('T')[0] : '';

        agrupado[clienteId].acoes.push({
          id: item.id,
          tipo_acao: 'Prospecção Fria',
          data_historico: dataAcao,
          relato: item.observacao || ''
        });
      });

      // Ordena cronologicamente decrescente as linhas do tempo combinadas
      const resultadoFinal = Object.values(agrupado).map((item: any) => {
        item.acoes.sort((a: any, b: any) => (b.data_historico || '').localeCompare(a.data_historico || ''));
        return item;
      });

      setRelatorioData(resultadoFinal);
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  const getTempStyle = (temp: string, active: boolean) => {
    if (!active) return 'bg-slate-100 text-slate-400 opacity-30 hover:opacity-100';
    switch (temp) {
      case 'quente': return 'bg-rose-500 text-white shadow-md scale-110';
      case 'frio': return 'bg-blue-500 text-white shadow-md scale-110';
      default: return 'bg-amber-500 text-white shadow-md scale-110';
    }
  };

  const getTempIcon = (temp: string) => {
    switch (temp) {
      case 'quente': return <Flame size={14} strokeWidth={3} />;
      case 'frio': return <Snowflake size={14} strokeWidth={3} />;
      default: return <Thermometer size={14} strokeWidth={3} />;
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("RELATÓRIO DE ATIVIDADES", 105, 15, { align: "center" });
    let currentY = 30;
    relatorioData.forEach((item) => {
      autoTable(doc, {
        startY: currentY,
        head: [['CLIENTE', 'STATUS', 'RETORNO']],
        body: [[
          item.info.razao_social || item.info.nome,
          (item.info.temperatura || 'morno').toUpperCase(),
          item.info.data_retorno ? format(new Date(item.info.data_retorno + 'T00:00:00'), 'dd/MM/yyyy') : '-'
        ]],
        headStyles: { fillColor: [40, 40, 40] }
      });
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY,
        head: [['DATA', 'AÇÃO', 'RELATO']],
        body: item.acoes.map((a: any) => [
          a.data_historico ? format(new Date(a.data_historico + 'T00:00:00'), 'dd/MM/yyyy') : '-', 
          a.tipo_acao, 
          a.relato
        ]),
        styles: { fontSize: 8 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    });
    doc.save("Relatorio.pdf");
  };

  return (
    <div className="p-6 min-h-screen bg-[#F8FAFC] dark:bg-[#09090B] pb-20">
      <Toaster position="bottom-right" />
      
      <div className="flex justify-between items-center mb-8 max-w-5xl mx-auto">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 mb-2 text-[10px] font-black uppercase">
            <ArrowLeft size={14} /> Voltar
          </button>
          <h1 className="text-2xl font-black italic uppercase text-slate-800 dark:text-zinc-100">Relatório de Atividades</h1>
        </div>
        <button onClick={handleExportPDF} className="flex items-center gap-2 bg-zinc-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-[11px]">
          <Printer size={18} /> Exportar PDF
        </button>
      </div>

      {/* Filtros */}
      <div className="max-w-5xl mx-auto bg-white dark:bg-zinc-900 p-6 rounded-[32px] border border-slate-200 dark:border-zinc-800 mb-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Data Início</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 rounded-2xl text-xs font-bold" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Data Fim</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 rounded-2xl text-xs font-bold" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Temperatura</label>
            <select value={filtroTemp} onChange={(e) => setFiltroTemp(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-zinc-800 rounded-2xl text-xs font-bold">
              <option value="todos">Todas</option>
              <option value="quente">🔥 Quente</option>
              <option value="morno">🟨 Morno</option>
              <option value="frio">❄️ Frio</option>
            </select>
          </div>
          <button onClick={carregarRelatorio} className="w-full bg-blue-600 text-white h-[56px] rounded-2xl font-black uppercase text-[11px]">
            {loading ? <Loader2 className="animate-spin mx-auto" /> : "Filtrar"}
          </button>
        </div>
      </div>

      {/* Lista de Clientes */}
      <div className="max-w-5xl mx-auto space-y-6">
        {relatorioData.map((item) => (
          <div key={item.id} className="bg-white dark:bg-zinc-900 rounded-[32px] border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="p-6 bg-slate-50/50 dark:bg-zinc-800/30 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="text-lg font-black text-slate-800 dark:text-zinc-100 uppercase italic mb-3">
                {item.info.razao_social || item.info.nome}
              </h3>
              
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl">
                  {['frio', 'morno', 'quente'].map((t) => (
                    <button
                      key={t}
                      onClick={() => atualizarTemperatura(item.id, t)}
                      className={`p-2 rounded-lg transition-all ${getTempStyle(t, item.info.temperatura === t)}`}
                    >
                      {getTempIcon(t)}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 px-3 py-1.5 rounded-xl shadow-sm">
                  <Clock size={14} className="text-blue-500" />
                  <span className="text-[10px] font-black text-slate-400 uppercase">Retorno:</span>
                  <input 
                    type="date" 
                    value={item.info.data_retorno || ""} 
                    onChange={(e) => atualizarDataRetorno(item.id, e.target.value)}
                    className="bg-transparent border-none text-[10px] font-bold text-slate-600 dark:text-zinc-300 focus:ring-0 p-0"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {item.acoes.map((acao: any) => (
                <div key={acao.id} className="relative pl-6 border-l-2 border-slate-100 dark:border-zinc-800 pb-2">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white dark:bg-zinc-900 border-2 border-blue-500 shadow-sm" />
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{acao.tipo_acao}</span>
                    <span className="text-[9px] font-bold text-slate-400">
                      {acao.data_historico ? format(new Date(acao.data_historico + 'T00:00:00'), 'dd/MM/yyyy') : '-'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-zinc-300 font-medium leading-relaxed">{acao.relato}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}