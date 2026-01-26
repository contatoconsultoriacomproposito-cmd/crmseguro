import React, { useMemo } from 'react';
import { FileText, ShieldCheck, XCircle } from 'lucide-react';

interface PropostaData {
  id: string;
  status: string;
  valor_total_proposta: number;
  corretor_id: string;
  data_emissao: string;
  created_at: string; // Agora declarado na interface
  data_venda?: string;
  updated_at?: string;
}

interface VisaoPropostasProps {
  propostasRaw: PropostaData[];
  dataInicio: string;
  dataFim: string;
  corretorId: string; // Mantido para consistência, mas o filtro agora é na fonte
}

export default function VisaoPropostas({ propostasRaw, dataInicio, dataFim }: VisaoPropostasProps) {
  
  const stats = useMemo(() => {
    const counts = {
      total: 0, vlrCriado: 0,
      vendidas: 0, vlrVendido: 0,
      perdidas: 0, vlrPerdido: 0
    };

    propostasRaw.forEach(p => {
      const valor = Number(p.valor_total_proposta || 0);
      const status = String(p.status || '').toLowerCase();
      
      // Normalização de Datas para comparação
      const dEmissao = (p.data_emissao || p.created_at || '').split(/[ T]/)[0];
      const dVenda = (p.data_venda || '').split(/[ T]/)[0];
      const dUpdate = (p.updated_at || p.created_at || '').split(/[ T]/)[0];

      // 1. CRIADAS (Data de Emissão)
      if (dEmissao >= dataInicio && dEmissao <= dataFim) {
        counts.total++;
        counts.vlrCriado += valor;
      }

      // 2. VENDIDAS (Filtra pelo status 'vendido' e data de venda)
      if (status === 'vendido') {
        const dataRefVenda = dVenda || dEmissao;
        if (dataRefVenda >= dataInicio && dataRefVenda <= dataFim) {
          counts.vendidas++;
          counts.vlrVendido += valor;
        }
      }

      // 3. PERDIDAS
      if (status === 'perdido') {
        if (dUpdate >= dataInicio && dUpdate <= dataFim) {
          counts.perdidas++;
          counts.vlrPerdido += valor;
        }
      }
    });

    const conversao = counts.total > 0 ? ((counts.vendidas / counts.total) * 100).toFixed(1) : "0.0";
    return { ...counts, conversao };
  }, [propostasRaw, dataInicio, dataFim]);

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
        <FileText size={14}/> 4. Visão de Propostas
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Criadas" val={stats.total} money={stats.vlrCriado} color="bg-indigo-500" icon={<FileText/>}/>
        <StatCard label="Vendidas" val={stats.vendidas} money={stats.vlrVendido} color="bg-emerald-500" icon={<ShieldCheck/>}/>
        <StatCard label="Perdidas" val={stats.perdidas} money={stats.vlrPerdido} color="bg-red-500" icon={<XCircle/>}/>
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
          <p className="text-[14px] font-black uppercase text-slate-400">Taxa de Conversão</p>
          <p className="text-3xl font-black text-slate-800">{stats.conversao}%</p>
          <div className="w-full h-1 bg-slate-100 mt-4 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${Math.min(Number(stats.conversao), 100)}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, val, money, color, icon }: any) {
  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden">
      <div className="absolute -right-4 -top-4 opacity-5 text-slate-800">{React.cloneElement(icon, { size: 80 })}</div>
      <div className={`${color} w-8 h-8 rounded-xl flex items-center justify-center text-white mb-4`}>{React.cloneElement(icon, { size: 16 })}</div>
      <p className="text-[14px] font-black uppercase text-slate-400">{label}</p>
      <p className="text-3xl font-black text-slate-800">{val || 0}</p>
      <p className="text-[14px] font-bold text-slate-500 mt-1">
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(money || 0)}
      </p>
    </div>
  );
}