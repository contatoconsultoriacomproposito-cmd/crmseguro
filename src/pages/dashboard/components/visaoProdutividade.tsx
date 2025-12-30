import { Activity, MessageCircle, Phone, Mail, Monitor, MapPin, TrendingUp, UserCheck } from 'lucide-react';

export default function VisaoProdutividade({ data }: { data: any }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
        <Activity size={14}/> 2. Produtividade (Interações)
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <ActionCard icon={<MessageCircle size={16}/>} label="WhatsApp" val={data.whatsapp} color="text-emerald-500" />
        <ActionCard icon={<Phone size={16}/>} label="Ligação" val={data.ligacao} color="text-blue-500" />
        <ActionCard icon={<Mail size={16}/>} label="E-mail" val={data.email} color="text-amber-500" />
        <ActionCard icon={<Monitor size={16}/>} label="R. Online" val={data.reuniaoOn} color="text-indigo-500" />
        <ActionCard icon={<MapPin size={16}/>} label="R. Presencial" val={data.reuniaoPres} color="text-rose-500" />
        <ActionCard icon={<UserCheck size={16}/>} label="C. Visitou" val={data.visita} color="text-violet-500" />
        <ActionCard icon={<TrendingUp size={16}/>} label="Outros" val={data.outros} color="text-slate-500" />
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