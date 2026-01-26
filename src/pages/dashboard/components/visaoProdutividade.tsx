import { useMemo } from 'react';
import { Activity, MessageCircle, Phone, Mail, Monitor, MapPin, TrendingUp, UserCheck } from 'lucide-react';

interface Interacao {
  tipo_acao: string;
  data_historico: string;
  corretor_id: string;
}

interface VisaoProdutividadeProps {
  interacoesRaw: Interacao[];
  dataInicio: string;
  dataFim: string;
  corretorId: string;
}

export default function VisaoProdutividade({ 
  interacoesRaw, 
  dataInicio, 
  dataFim, 
  corretorId 
}: VisaoProdutividadeProps) {

  // --- LÓGICA DE FILTRAGEM E CONTAGEM ---
  const stats = useMemo(() => {
    const counts = {
      whatsapp: 0,
      ligacao: 0,
      email: 0,
      reuniaoOn: 0,
      reuniaoPres: 0,
      visita: 0,
      outros: 0
    };

    interacoesRaw.forEach(inter => {
      // 1. Filtro de Data
      const dataInter = inter.data_historico; // Já é date no banco
      const dentroPeriodo = dataInter >= dataInicio && dataInter <= dataFim;

      // 2. Filtro de Corretor
      const filtroCorretor = corretorId === 'todos' || inter.corretor_id === corretorId;

      if (dentroPeriodo && filtroCorretor) {
        const acao = inter.tipo_acao?.toUpperCase();

        if (acao.includes('WHATSAPP')) counts.whatsapp++;
        else if (acao.includes('LIGAÇÃO') || acao.includes('LIGACAO') || acao.includes('TELEFONE')) counts.ligacao++;
        else if (acao.includes('EMAIL') || acao.includes('E-MAIL')) counts.email++;
        else if (acao.includes('REUNIÃO ONLINE') || acao.includes('REUNIAO ONLINE')) counts.reuniaoOn++;
        else if (acao.includes('REUNIÃO PRESENCIAL') || acao.includes('REUNIAO PRESENCIAL')) counts.reuniaoPres++;
        else if (acao.includes('VISITA')) counts.visita++;
        else counts.outros++;
      }
    });

    return counts;
  }, [interacoesRaw, dataInicio, dataFim, corretorId]);

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
        <Activity size={14}/> 3. Produtividade (Interações)
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <ActionCard icon={<MessageCircle size={16}/>} label="WhatsApp" val={stats.whatsapp} color="text-emerald-500" />
        <ActionCard icon={<Phone size={16}/>} label="Ligação" val={stats.ligacao} color="text-blue-500" />
        <ActionCard icon={<Mail size={16}/>} label="E-mail" val={stats.email} color="text-amber-500" />
        <ActionCard icon={<Monitor size={16}/>} label="R. Online" val={stats.reuniaoOn} color="text-indigo-500" />
        <ActionCard icon={<MapPin size={16}/>} label="R. Presencial" val={stats.reuniaoPres} color="text-rose-500" />
        <ActionCard icon={<UserCheck size={16}/>} label="C. Visitou" val={stats.visita} color="text-violet-500" />
        <ActionCard icon={<TrendingUp size={16}/>} label="Outros" val={stats.outros} color="text-slate-500" />
      </div>
    </section>
  );
}

function ActionCard({ icon, label, val, color }: any) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center space-y-1 hover:border-indigo-100 transition-all hover:shadow-md">
      <div className={`flex justify-center ${color}`}>{icon}</div>
      <p className="text-[22px] font-black text-slate-800">{Number(val || 0)}</p>
      <p className="text-[10px] font-black uppercase text-slate-400 truncate px-1">{label}</p>
    </div>
  );
}