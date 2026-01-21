import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { BarChart3, Calendar, RotateCcw, Loader2 } from 'lucide-react';

// Importação dos Componentes Modulares
import VisaoCliente from './components/visaoCliente';
import VisaoPropostas from './components/visaoPropostas';
import VisaoProdutividade from './components/visaoProdutividade';
import VisaoComissoes from './components/visaoComissoes';
import VisaoSinistros from './components/visaoSinistros';
import VisaoSeguradoras from './components/visaoSeguradoras'; // ADICIONADO

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [corretores, setCorretores] = useState<any[]>([]);
  
  const [clientesRaw, setClientesRaw] = useState<any[]>([]);
  const [interacoesRaw, setInteracoesRaw] = useState<any[]>([]);
  const [propostasRaw, setPropostasRaw] = useState<any[]>([]); 
  const [itensRaw, setItensRaw] = useState<any[]>([]);
  const [comissoesRaw, setComissoesRaw] = useState<any[]>([]);
  const [sinistrosRaw, setSinistrosRaw] = useState<any[]>([]);

  const getPrimeiroDiaMes = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA');
  };
  const getDataHoje = () => new Date().toLocaleDateString('en-CA');

  const [dataInicio, setDataInicio] = useState(getPrimeiroDiaMes());
  const [dataFim, setDataFim] = useState(getDataHoje());
  const [corretorId, setCorretorId] = useState('todos');

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: perfil } = await supabase
        .from('usuarios_perfis')
        .select('*')
        .eq('id', user.id)
        .single();

      if (perfil) {
        setUserProfile(perfil);
        if (perfil.tipo_usuario === 'CORRETOR') {
          setCorretorId(perfil.id);
          setCorretores([perfil]);
        } else {
          const { data: lista } = await supabase
            .from('usuarios_perfis')
            .select('id, nome')
            .eq('corretora_id', perfil.corretora_id)
            .eq('tipo_usuario', 'CORRETOR')
            .order('nome');
          if (lista) setCorretores(lista);
        }
      }
    }
    init();
  }, []);

  const fetchAllData = async () => {
    if (!userProfile?.corretora_id) return;
    setLoading(true);
    try {
      const cid = userProfile.corretora_id;
      let idsFiltro = corretorId === 'todos' ? corretores.map(c => c.id) : [corretorId];
      if (idsFiltro.length === 0 && userProfile.tipo_usuario === 'CORRETOR') idsFiltro = [userProfile.id];

      let qCli = supabase.from('tab_clientes').select('*, tab_propostas(status, created_at)').eq('corretora_id', cid);
      let qInt = supabase.from('tab_interacoes').select('*, data_historico').eq('corretora_id', cid);
      let qProp = supabase.from('tab_propostas').select('*').eq('corretora_id', cid);
      let qItens = supabase.from('tab_proposta_itens').select('*, base_produtos(nome)');
      let qCom = supabase.from('tab_comissoes').select('*, base_produtos(nome)');
      let qSin = supabase.from('tab_sinistros').select('*, item_id').eq('corretora_id', cid);

      if (idsFiltro.length > 0) {
        qCom = qCom.in('corretor_id', idsFiltro);
        qSin = qSin.in('corretor_id', idsFiltro);
      }

      if (corretorId !== 'todos') {
        qCli = qCli.eq('corretor_id', corretorId);
        qInt = qInt.eq('corretor_id', corretorId);
        qProp = qProp.eq('corretor_id', corretorId);
      }

      const [rCli, rInt, rProp, rItens, rCom, rSin] = await Promise.all([
        qCli, qInt, qProp, qItens, qCom, qSin
      ]);

      setClientesRaw(rCli.data || []);
      setInteracoesRaw(rInt.data || []);
      setPropostasRaw(rProp.data || []);
      setItensRaw(rItens.data || []);
      setComissoesRaw(rCom.data || []);
      setSinistrosRaw(rSin.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.corretora_id) fetchAllData();
  }, [userProfile, corretorId, dataInicio, dataFim]);

  const stats = useMemo(() => {
    const s = {
      clientes: { total: 0, pf: 0, pj: 0 },
      produtividade: { whatsapp: 0, ligacao: 0, email: 0, reuniaoOn: 0, reuniaoPres: 0, visita: 0, outros: 0 },
      propostas: { total: 0, vendidas: 0, perdidas: 0, vlrCriado: 0, vlrVendido: 0, vlrPerdido: 0 },
      comissoes: { comissaoTotal: 0, comissaoRecebida: 0, comissaoPendente: 0, detalhe: [] as any[] },
      sinistros: { abertos: 0, finalizados: 0, detalheAbertos: [] as any[], detalheFinalizados: [] as any[] },
      seguradoras: [] as any[] // ADICIONADO
    };

    clientesRaw.forEach(c => {
      const d = (c.created_at || '').split('T')[0];
      if (d >= dataInicio && d <= dataFim) {
        s.clientes.total++;
        c.tipo_cliente === 'PJ' ? s.clientes.pj++ : s.clientes.pf++;
      }
    });

    interacoesRaw.forEach(i => {
      const d = (i.data_historico || '').split('T')[0];
      if (d >= dataInicio && d <= dataFim) {
        const a = i.tipo_acao;
        if (a === 'WhatsApp') s.produtividade.whatsapp++;
        else if (a === 'Ligação') s.produtividade.ligacao++;
        else if (a === 'E-mail') s.produtividade.email++;
        else if (a === 'Reunião Online') s.produtividade.reuniaoOn++;
        else if (a === 'Reunião Presencial (visita)') s.produtividade.reuniaoPres++;
        else if (a === 'Cliente Visitou') s.produtividade.visita++;
        else s.produtividade.outros++;
      }
    });

    const resumoSeg: Record<string, any> = {}; // Auxiliar para seguradoras

    propostasRaw.forEach(p => {
      const d = (p.created_at || '').split('T')[0];
      if (d >= dataInicio && d <= dataFim) {
        const v = Number(p.valor_total_proposta || 0);
        s.propostas.total++;
        s.propostas.vlrCriado += v;
        
        if (p.status === 'Vendido') { 
          s.propostas.vendidas++; 
          s.propostas.vlrVendido += v; 

          // Lógica de Agrupamento por Seguradora (CORREÇÃO)
          const nomeSeg = p.seguradora_nome || 'Não Informada';
          if (!resumoSeg[nomeSeg]) {
            resumoSeg[nomeSeg] = { nome: nomeSeg, vendidas: 0, valor: 0, prodStats: {} };
          }
          resumoSeg[nomeSeg].vendidas++;
          resumoSeg[nomeSeg].valor += v;

          const nomeProd = p.produto_nome || 'Outros';
          if (!resumoSeg[nomeSeg].prodStats[nomeProd]) {
            resumoSeg[nomeSeg].prodStats[nomeProd] = { nome: nomeProd, vendidas: 0 };
          }
          resumoSeg[nomeSeg].prodStats[nomeProd].vendidas++;
        }
        else if (p.status === 'Perdido') { s.propostas.perdidas++; s.propostas.vlrPerdido += v; }
      }
    });

    s.seguradoras = Object.values(resumoSeg); // Converte objeto em array para o componente

    comissoesRaw.forEach(c => {
      if (c.data_venda >= dataInicio && c.data_venda <= dataFim) {
        const v = Number(c.valor_comissao || 0);
        const st = (c.status_comissao || '').toUpperCase();
        s.comissoes.comissaoTotal += v;
        (st === 'PAGO' || st === 'RECEBIDA') ? s.comissoes.comissaoRecebida += v : s.comissoes.comissaoPendente += v;
        s.comissoes.detalhe.push(c);
      }
    });

    sinistrosRaw.forEach((sin: any) => {
      const dataBruta = sin.data_abertura || sin.criado_em || '';
      const dataRef = dataBruta.split(/[ T]/)[0];
      if (dataRef >= dataInicio && dataRef <= dataFim) {
        const status = String(sin.status || '').toLowerCase().trim();
        const itemEncontrado = itensRaw?.find((i: any) => i.id === sin.item_id);
        const nomeProduto = itemEncontrado?.base_produtos?.nome || 'Produto não identificado';

        if (['aberto', 'em andamento', 'cadastro'].includes(status)) {
          s.sinistros.abertos++;
          const exist = s.sinistros.detalheAbertos.find((d: any) => d.produto === nomeProduto);
          if (exist) exist.quantidade++;
          else s.sinistros.detalheAbertos.push({ produto: nomeProduto, quantidade: 1 });
        } 
        else if (['finalizado', 'concluído', 'concluido', 'encerrado'].includes(status)) {
          s.sinistros.finalizados++;
          const exist = s.sinistros.detalheFinalizados.find((d: any) => d.produto === nomeProduto);
          if (exist) exist.quantidade++;
          else s.sinistros.detalheFinalizados.push({ produto: nomeProduto, quantidade: 1 });
        }
      }
    });

    return s;
  }, [clientesRaw, interacoesRaw, propostasRaw, itensRaw, comissoesRaw, sinistrosRaw, dataInicio, dataFim]);

  if (loading && clientesRaw.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <h2 className="text-indigo-600 font-black uppercase tracking-tighter">Sincronizando Base de Dados...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 space-y-12">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black italic uppercase text-slate-800 flex items-center gap-3">
            <BarChart3 size={32} className="text-indigo-600" /> Dashboard Comercial
          </h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Controle de Performance v2.0</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
            <Calendar size={16} className="text-indigo-500" />
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="text-xs font-bold outline-none bg-transparent" />
            <span className="text-slate-300 font-bold">/</span>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="text-xs font-bold outline-none bg-transparent" />
          </div>

          {userProfile?.tipo_usuario !== 'CORRETOR' && (
            <select 
              value={corretorId} 
              onChange={e => setCorretorId(e.target.value)}
              className="bg-white p-3 rounded-2xl border border-slate-100 text-xs font-black uppercase text-indigo-600 shadow-sm outline-none"
            >
              <option value="todos">Todos os Corretores</option>
              {corretores.map(corr => <option key={corr.id} value={corr.id}>{corr.nome}</option>)}
            </select>
          )}

          <button 
            onClick={() => { setDataInicio(getPrimeiroDiaMes()); setDataFim(getDataHoje()); setCorretorId('todos'); }}
            className="p-3 bg-slate-800 text-white rounded-2xl hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      <VisaoCliente dataRaw={clientesRaw} dataInicio={dataInicio} dataFim={dataFim} />
      <VisaoProdutividade data={stats.produtividade} />
      <VisaoPropostas data={stats.propostas} />
      
      {/* EXIBIÇÃO DA VISÃO DE SEGURADORAS */}
      <VisaoSeguradoras data={stats.seguradoras} /> 
      
      <VisaoComissoes data={stats.comissoes} />
      <VisaoSinistros data={stats.sinistros} />
    </div>
  );
}