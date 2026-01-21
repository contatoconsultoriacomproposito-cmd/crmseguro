import { DollarSign} from 'lucide-react';

type VisaoComissoesProps = {
  data: {
    comissaoTotal: number;
    comissaoRecebida: number;
    comissaoPendente: number;
    detalhe: any[];
  };
};

export default function VisaoComissoes({ data }: VisaoComissoesProps) {
  const bcl = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const percentualRecebido = data?.comissaoTotal > 0 ? (data.comissaoRecebida / data.comissaoTotal) * 100 : 0;

  return (
    <section className="space-y-6">
      <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
        <DollarSign size={14} /> 4. Comissões
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
           <p className="text-[10px] font-black text-slate-400 uppercase">Comissão Total</p>
           <p className="text-3xl font-black text-indigo-600">{bcl(data.comissaoTotal)}</p>
        </div>
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
           <p className="text-[10px] font-black text-slate-400 uppercase text-emerald-500">Recebida</p>
           <p className="text-3xl font-black text-emerald-600">{bcl(data.comissaoRecebida)}</p>
        </div>
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
           <p className="text-[10px] font-black text-slate-400 uppercase text-amber-500">Pendente</p>
           <p className="text-3xl font-black text-amber-500">{bcl(data.comissaoPendente)}</p>
        </div>
        <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
           <p className="text-[10px] font-black text-slate-400 uppercase">% Recebido</p>
           <p className="text-3xl font-black text-slate-800">{percentualRecebido.toFixed(1)}%</p>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <h3 className="text-sm font-black uppercase text-slate-700">Detalhamento Comissões</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Seguradora</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Produto</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.detalhe.length > 0 ? data.detalhe.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors text-xs">
                  <td className="px-6 py-4 font-bold text-slate-700">{item.nome_seguradora || 'N/A'}</td>
                  <td className="px-6 py-4 text-slate-600">{item.base_produtos?.nome || 'Não informado'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                      item.status_comissao === 'PAGO' || item.status_comissao === 'RECEBIDO' 
                      ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {item.status_comissao}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-700">{bcl(item.valor_comissao)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-xs font-bold text-slate-400 uppercase">Nenhum dado encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}