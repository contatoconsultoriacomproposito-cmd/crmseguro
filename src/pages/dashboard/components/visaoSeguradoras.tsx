import { useMemo } from 'react';
import { ShieldCheck, Package } from 'lucide-react';

interface VisaoSeguradorasProps {
  propostasRaw: any[];
  dataInicio: string;
  dataFim: string;
  corretorId: string;
}

export default function VisaoSeguradoras({ propostasRaw, dataInicio, dataFim, corretorId }: VisaoSeguradorasProps) {
  
  const stats = useMemo(() => {
    const resumoSeg: Record<string, any> = {};
    const resumoProd: Record<string, any> = {};

    propostasRaw.forEach(p => {
      // 1. Filtros de Corretor e Data
      const pertenceAoCorretor = corretorId === 'todos' || p.corretor_id === corretorId;
      const status = String(p.status || '').toLowerCase().trim();
      const dataBruta = p.data_venda || p.data_emissao || p.created_at || '';
      const dataRef = dataBruta.split(/[ T]/)[0];

      if (pertenceAoCorretor && status === 'vendido' && dataRef >= dataInicio && dataRef <= dataFim) {
        
        // Percorre as OPÇÕES (Para o Container 1: Seguradoras)
        p.tab_proposta_opcoes?.forEach((opcao: any) => {
          const nomeSeg = opcao.base_seguradoras?.nome || 'NÃO INFORMADA';
          const valorOpcao = Number(opcao.valor_total_opcao || 0);

          if (!resumoSeg[nomeSeg]) {
            resumoSeg[nomeSeg] = { nome: nomeSeg, qtd: 0, valor: 0 };
          }
          resumoSeg[nomeSeg].qtd++;
          resumoSeg[nomeSeg].valor += valorOpcao;

          // Percorre os ITENS dentro da opção (Para o Container 2: Produtos)
          opcao.tab_proposta_itens?.forEach((item: any) => {
            const nomeProd = item.base_produtos?.nome || 'OUTROS';
            const valorPremio = Number(item.valor_premio || 0);

            if (!resumoProd[nomeProd]) {
              resumoProd[nomeProd] = { nome: nomeProd, qtd: 0, valor: 0 };
            }
            resumoProd[nomeProd].qtd++;
            resumoProd[nomeProd].valor += valorPremio;
          });
        });
      }
    });

    return {
      seguradoras: Object.values(resumoSeg).sort((a: any, b: any) => b.valor - a.valor),
      produtos: Object.values(resumoProd).sort((a: any, b: any) => b.valor - a.valor)
    };
  }, [propostasRaw, dataInicio, dataFim, corretorId]);

  //if (stats.seguradoras.length === 0 && stats.produtos.length === 0) return null;

  return (
    <div className="space-y-10">
      {/* CONTAINER 1: SEGURADORAS */}
      <section className="space-y-4">
        <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
          <ShieldCheck size={14} className="text-indigo-500"/> 6. Performance por Seguradora
        </h2>
        
        {stats.seguradoras.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.seguradoras.map((seg: any, idx) => (
              <CardAnalise key={idx} nome={seg.nome} qtd={seg.qtd} valor={seg.valor} cor="indigo" label="Propostas" />
            ))}
          </div>
        ) : (
          <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-[24px] text-[10px] font-black uppercase text-slate-300 tracking-widest">
            Nenhuma seguradora com vendas no período
          </div>
        )}
      </section>

      {/* CONTAINER 2: PRODUTOS */}
      <section className="space-y-4">
        <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
          <Package size={14} className="text-emerald-500"/> 6. Mix de Produtos Vendidos
        </h2>

        {stats.produtos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.produtos.map((prod: any, idx) => (
              <CardAnalise key={idx} nome={prod.nome} qtd={prod.qtd} valor={prod.valor} cor="emerald" label="Itens" />
            ))}
          </div>
        ) : (
          <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-[24px] text-[10px] font-black uppercase text-slate-300 tracking-widest">
            Nenhum produto vendido no período
          </div>
        )}
      </section>
    </div>
  );
}

function CardAnalise({ nome, qtd, valor, cor, label }: any) {
  const bgStyles = cor === 'indigo' ? 'bg-indigo-50/50 border-indigo-100' : 'bg-emerald-50/50 border-emerald-100';
  const textStyles = cor === 'indigo' ? 'text-indigo-700' : 'text-emerald-700';

  return (
    <div className={`p-5 rounded-[24px] border ${bgStyles} space-y-3`}>
      <div className="flex justify-between items-start">
        <h3 className="text-[11px] font-black text-slate-800 uppercase leading-tight w-2/3">{nome}</h3>
        <span className={`text-[10px] font-black px-2 py-1 rounded-lg bg-white border border-slate-100 ${textStyles}`}>
          {qtd} {label}
        </span>
      </div>
      <div>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Volume Total</p>
        <p className={`text-lg font-black ${textStyles}`}>
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)}
        </p>
      </div>
    </div>
  );
}