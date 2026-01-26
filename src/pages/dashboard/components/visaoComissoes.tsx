import { useMemo } from 'react';
import { DollarSign, CheckCircle2, Clock } from 'lucide-react';

interface VisaoComissoesProps {
  comissoesRaw: any[];
  dataInicio: string;
  dataFim: string;
  corretorId: string;
}

export default function VisaoComissoes({ comissoesRaw, dataInicio, dataFim, corretorId }: VisaoComissoesProps) {
  const bcl = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const stats = useMemo(() => {
    const s = { total: 0, recebido: 0, pendente: 0, detalhe: [] as any[] };

    (comissoesRaw || []).forEach((c) => {
      // 1. Filtro de Corretor (Respeitando a 'Casa' / Nulos)
      const itemCorretorId = c.corretor_id || '';
      const passaFiltroCorretor = corretorId === 'todos' || itemCorretorId === corretorId;

      // 2. Lógica de Data: Usamos a data de venda para o período do Dashboard
      const dataRef = (c.data_venda || '').split(/[ T]/)[0];
      const dentroDoPeriodo = dataRef >= dataInicio && dataRef <= dataFim;

      if (dentroDoPeriodo && passaFiltroCorretor) {
        const valor = Number(c.valor_comissao || 0);
        
        // REGRA DE OURO DA SUA CENTRAL: 
        // Se tem data_recebimento preenchida, está liquidado.
        const isLiquidado = c.data_recebimento !== null && c.data_recebimento !== undefined;

        s.total += valor;
        if (isLiquidado) {
          s.recebido += valor;
        } else {
          s.pendente += valor;
        }
        
        // Adicionamos uma flag formatada para a tabela
        s.detalhe.push({
          ...c,
          status_real: isLiquidado ? 'LIQUIDADO' : 'AGUARDANDO'
        });
      }
    });

    const percentual = s.total > 0 ? (s.recebido / s.total) * 100 : 0;
    return { ...s, percentual };
  }, [comissoesRaw, dataInicio, dataFim, corretorId]);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
          <DollarSign size={14} /> 7. Gestão de Comissões e Receita
        </h2>
        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100 uppercase">
          Status por Data de Recebimento
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden group">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-1 text-center">Previsão Total no Período</p>
          <p className="text-3xl font-black text-slate-800 text-center">{bcl(stats.total)}</p>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm border-b-4 border-b-emerald-500">
          <p className="text-[10px] font-black text-emerald-500 uppercase mb-1 flex items-center justify-center gap-1">
            <CheckCircle2 size={10} /> Liquidado (Em Caixa)
          </p>
          <p className="text-3xl font-black text-emerald-600 text-center">{bcl(stats.recebido)}</p>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm border-b-4 border-b-amber-500">
          <p className="text-[10px] font-black text-amber-500 uppercase mb-1 flex items-center justify-center gap-1">
            <Clock size={10} /> Aguardando Seguradora
          </p>
          <p className="text-3xl font-black text-amber-500 text-center">{bcl(stats.pendente)}</p>
        </div>

        <div className="bg-indigo-600 p-6 rounded-[32px] shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black text-indigo-100 uppercase mb-1 text-center italic">Eficiência de Recebimento</p>
          <p className="text-4xl font-black text-white text-center">{stats.percentual.toFixed(1)}%</p>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Data Venda</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Cliente / Seguradora</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Produto</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Status Financeiro</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Comissão Bruta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stats.detalhe.length > 0 ? stats.detalhe.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors text-xs">
                  <td className="px-6 py-4 font-medium text-slate-500">
                    {item.data_venda ? new Date(item.data_venda).toLocaleDateString('pt-BR') : '---'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-800 uppercase tracking-tighter italic">
                        {item.tab_clientes?.nome || 'CLIENTE N/A'}
                      </span>
                      <span className="text-[10px] text-indigo-500 font-bold uppercase">{item.nome_seguradora}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-600">
                    {item.base_produtos?.nome || '---'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                      item.status_real === 'LIQUIDADO'
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                      : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {item.status_real}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-800 text-sm">
                    {bcl(item.valor_comissao)}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center opacity-30 italic font-black uppercase text-xs">
                    Nenhum lançamento financeiro encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}