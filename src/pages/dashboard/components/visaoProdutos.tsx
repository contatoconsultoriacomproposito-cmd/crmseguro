import { useMemo } from 'react';
import { Briefcase } from 'lucide-react';

interface VisaoProdutosProps {
  propostasRaw: any[];
  dataInicio: string;
  dataFim: string;
  corretorId: string;
}

export default function VisaoProdutos({ propostasRaw, dataInicio, dataFim, corretorId }: VisaoProdutosProps) {
  
  const produtosStats = useMemo(() => {
    const resumo: Record<string, any> = {};

    propostasRaw.forEach(p => {
      // 1. Filtro de Corretor
      const pertenceAoCorretor = corretorId === 'todos' || p.corretor_id === corretorId;
      if (!pertenceAoCorretor) return;

      // 2. Filtro de Data (Baseado na criação da proposta para volume total)
      const dataRef = (p.created_at || '').split(/[ T]/)[0];
      if (dataRef < dataInicio || dataRef > dataFim) return;

      const status = String(p.status || '').toLowerCase();
      
      // 3. Percorrer opções e itens para somar por produto
      // Nota: Propostas podem ter múltiplos itens. Vamos atribuir o valor proporcional ou total ao produto.
      p.tab_proposta_opcoes?.forEach((opcao: any) => {
        opcao.tab_proposta_itens?.forEach((item: any) => {
          const nomeProd = item.base_produtos?.nome || 'OUTROS';
          
          if (!resumo[nomeProd]) {
            resumo[nomeProd] = { nome: nomeProd, criadas: 0, vendidas: 0, vlrCriado: 0, vlrVendido: 0 };
          }

          const valorOpcao = Number(opcao.valor_total_opcao || 0);

          resumo[nomeProd].criadas++;
          resumo[nomeProd].vlrCriado += valorOpcao;

          if (status === 'vendido') {
            resumo[nomeProd].vendidas++;
            resumo[nomeProd].vlrVendido += valorOpcao;
          }
        });
      });
    });

    // Converte para array e ordena pelos mais vendidos
    return Object.values(resumo).sort((a, b) => b.vlrVendido - a.vlrVendido);
  }, [propostasRaw, dataInicio, dataFim, corretorId]);

  //if (produtosStats.length === 0) return null;

  return (
  <section className="space-y-4">
    <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
      <Briefcase size={14}/> 5. Performance por Produto
    </h2>

    {produtosStats.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {produtosStats.map((p: any) => (
          <div key={p.nome} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm space-y-3 hover:border-indigo-100 transition-all">
            <p className="font-black text-slate-800 uppercase text-xs italic tracking-tight">{p.nome}</p>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 p-3 rounded-2xl">
                <p className="text-slate-400 text-[9px] font-black uppercase">Criadas</p>
                <p className="font-bold text-[11px] text-slate-700">
                  {p.criadas} <span className="text-[9px] font-medium opacity-70">({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(p.vlrCriado)})</span>
                </p>
              </div>
              
              <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100/50">
                <p className="text-emerald-600 font-black text-[9px] uppercase">Vendidas</p>
                <p className="font-bold text-[11px] text-emerald-700">
                  {p.vendidas} <span className="text-[9px] font-medium opacity-70">({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(p.vlrVendido)})</span>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
               <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
                  <div 
                    className="bg-indigo-500 h-full transition-all" 
                    style={{ width: `${Math.min((p.vendidas / (p.criadas || 1)) * 100, 100)}%` }}
                  />
               </div>
               <span className="text-[10px] font-black text-indigo-600 ml-3 whitespace-nowrap">
                 {((p.vendidas / (p.criadas || 1)) * 100).toFixed(1)}% CONV.
               </span>
            </div>
          </div>
        ))}
      </div>
    ) : (
      /* FEEDBACK VISUAL QUANDO VAZIO */
      <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[32px] bg-slate-50/30">
        <Briefcase size={24} className="text-slate-200 mb-2" />
        <p className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em]">
          Nenhuma movimentação de produtos encontrada
        </p>
      </div>
    )}
  </section>
);
}