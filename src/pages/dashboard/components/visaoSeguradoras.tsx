import { useMemo } from 'react';
import { ShieldCheck, TrendingUp, Award} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip} from 'recharts';

interface VisaoSeguradorasProps {
  propostasRaw: any[];
  dataInicio: string;
  dataFim: string;
  corretorId: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4'];

export default function VisaoSeguradoras({ propostasRaw, dataInicio, dataFim, corretorId }: VisaoSeguradorasProps) {
  
  const stats = useMemo(() => {
    const resumoSeg: Record<string, any> = {};

    propostasRaw.forEach(p => {
      const pertenceAoCorretor = corretorId === 'todos' || p.corretor_id === corretorId;
      const status = String(p.status || '').toLowerCase().trim();
      const dataRef = (p.data_venda || p.data_emissao || p.created_at || '').split(/[ T]/)[0];

      if (pertenceAoCorretor && status === 'vendido' && dataRef >= dataInicio && dataRef <= dataFim) {
        
        p.tab_proposta_opcoes?.forEach((opcao: any) => {
          const nomeSeg = opcao.base_seguradoras?.nome || 'NÃO INFORMADA';
          const valorOpcao = Number(opcao.valor_total_opcao || 0);

          if (!resumoSeg[nomeSeg]) {
            resumoSeg[nomeSeg] = { 
              nome: nomeSeg, 
              qtd: 0, 
              valor: 0, 
              produtos: {} as Record<string, {qtd: number, valor: number}> 
            };
          }
          resumoSeg[nomeSeg].qtd++;
          resumoSeg[nomeSeg].valor += valorOpcao;

          opcao.tab_proposta_itens?.forEach((item: any) => {
            const nomeProd = item.base_produtos?.nome || 'OUTROS';
            const valorPremio = Number(item.valor_premio || 0);

            if (!resumoSeg[nomeSeg].produtos[nomeProd]) {
              resumoSeg[nomeSeg].produtos[nomeProd] = { qtd: 0, valor: 0 };
            }
            resumoSeg[nomeSeg].produtos[nomeProd].qtd++;
            resumoSeg[nomeSeg].produtos[nomeProd].valor += valorPremio;
          });
        });
      }
    });

    const listaOrdenada = Object.values(resumoSeg).sort((a: any, b: any) => b.valor - a.valor);
    const totalGeral = listaOrdenada.reduce((acc, curr) => acc + curr.valor, 0);

    return {
      seguradoras: listaOrdenada,
      totalGeral,
      chartData: listaOrdenada.map(s => ({ name: s.nome, value: s.valor }))
    };
  }, [propostasRaw, dataInicio, dataFim, corretorId]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER E MARKET SHARE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
          <h2 className="text-sm font-black uppercase text-slate-500 mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo-500"/> Market Share Valor
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={stats.chartData} 
                  innerRadius={60} 
                  outerRadius={80} 
                  paddingAngle={5} 
                  dataKey="value"
                >
                  {stats.chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                </Pie>
                <Tooltip 
                  formatter={(val: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-indigo-600 p-8 rounded-[32px] text-white flex flex-col justify-center relative overflow-hidden shadow-xl shadow-indigo-200">
          <Award size={180} className="absolute -right-10 -bottom-10 opacity-10 rotate-12" />
          <div className="relative z-10">
            <p className="text-indigo-200 text-xs font-black uppercase tracking-[0.2em] mb-2">Produção Total Seguradoras</p>
            <h1 className="text-5xl font-black mb-4">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalGeral)}
            </h1>
            <div className="flex gap-6">
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                <p className="text-[10px] font-bold text-indigo-100 uppercase">Seguradora Líder</p>
                <p className="text-sm font-black uppercase italic">{stats.seguradoras[0]?.nome || '---'}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                <p className="text-[10px] font-bold text-indigo-100 uppercase">Parceiras Ativas</p>
                <p className="text-sm font-black">{stats.seguradoras.length} Empresas</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LISTA DETALHADA POR SEGURADORA */}
      <section className="space-y-4">
        <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
          <ShieldCheck size={14} className="text-indigo-500"/> Detalhamento por Companhia
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stats.seguradoras.map((seg: any, idx) => (
            <div key={idx} className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              {/* Header da Seguradora */}
              <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase italic tracking-tight">{seg.nome}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{seg.qtd} Propostas Vendidas</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-indigo-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(seg.valor)}
                  </p>
                  <p className="text-[9px] font-black text-slate-400">TOTAL EM PRÊMIO</p>
                </div>
              </div>

              {/* Itens/Produtos vendidos por essa seguradora */}
              <div className="p-6 space-y-3 bg-white">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Mix de Produtos na Cia</p>
                {Object.entries(seg.produtos).map(([prodNome, data]: any) => (
                  <div key={prodNome} className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-slate-600 uppercase">{prodNome}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">{data.qtd} un.</span>
                      <span className="text-xs font-black text-slate-700 w-24 text-right">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(data.valor)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEEDBACK VAZIO */}
      {stats.seguradoras.length === 0 && (
        <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[32px] bg-slate-50/30">
          <ShieldCheck size={32} className="text-slate-200 mb-2" />
          <p className="text-xs font-black uppercase text-slate-400 tracking-widest">
            Sem dados de seguradoras no período selecionado
          </p>
        </div>
      )}
    </div>
  );
}