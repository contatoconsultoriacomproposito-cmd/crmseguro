// src/pages/portal/components/FormIndicacao.tsx
import { User, ShieldCheck, Phone, Mail, ChevronRight, MessageSquare, Send, Loader2 } from "lucide-react";
import { UploadArea } from "./UploadArea";
import { maskPhone, maskCPF, maskCNPJ } from "../../../utils/masks";

interface FormProps {
  form: any;
  setForm: (form: any) => void;
  produtos: any[];
  documentos: any;
  setDocumentos: (docs: any) => void;
  enviando: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const FormIndicacao = ({ form, setForm, produtos, documentos, setDocumentos, enviando, onSubmit }: FormProps) => (
  <form onSubmit={onSubmit} className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 space-y-4">
    <div className="relative">
      <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
      <input required className="w-full h-14 pl-14 pr-5 rounded-xl bg-slate-50 font-bold text-xs outline-none border-2 border-transparent focus:border-blue-500 transition-all" placeholder="NOME DO CLIENTE" value={form.nome_cliente} onChange={e => setForm({...form, nome_cliente: e.target.value})} />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="relative">
        <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
        <input 
          required 
          className="w-full h-14 pl-14 pr-5 rounded-xl bg-slate-50 font-bold text-xs outline-none border-2 border-transparent focus:border-blue-500 transition-all" 
          placeholder="CPF OU CNPJ DO CLIENTE" 
          value={form.documento_cliente || ''} 
          onChange={e => {
            const rawValue = e.target.value.replace(/\D/g, "");
            const maskedValue = rawValue.length <= 11 ? maskCPF(rawValue) : maskCNPJ(rawValue);
            setForm({...form, documento_cliente: maskedValue});
          }} 
          maxLength={18}
        />
      </div>
      
      <div className="relative">
        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
        <input required className="w-full h-14 pl-14 pr-5 rounded-xl bg-slate-50 font-bold text-xs outline-none border-2 border-transparent focus:border-blue-500 transition-all" placeholder="WHATSAPP" value={form.telefone_cliente} onChange={e => setForm({...form, telefone_cliente: maskPhone(e.target.value)})} />
      </div>
    </div>

    <div className="relative">
      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
      <input type="email" required className="w-full h-14 pl-14 pr-5 rounded-xl bg-slate-50 font-bold text-xs outline-none border-2 border-transparent focus:border-blue-500 transition-all" placeholder="EMAIL DO CLIENTE" value={form.email_cliente} onChange={e => setForm({...form, email_cliente: e.target.value})} />
    </div>

    <div className="relative">
      <select required className="w-full h-14 px-5 rounded-xl bg-slate-50 font-bold text-xs appearance-none outline-none border-2 border-transparent focus:border-blue-500 transition-all cursor-pointer" value={form.produto_interest} onChange={e => setForm({...form, produto_interesse: e.target.value})}>
        <option value="">PRODUTO DE INTERESSE...</option>
        {produtos.map((p, idx) => <option key={idx} value={p.nome}>{p.nome}</option>)}
      </select>
      <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 rotate-90" size={18} />
    </div>

    <UploadArea documentos={documentos} setDocumentos={setDocumentos} />

    <div className="relative">
      <MessageSquare className="absolute left-5 top-4 text-slate-300" size={18} />
      <textarea rows={2} className="w-full pl-14 pr-5 py-4 rounded-xl bg-slate-50 font-bold text-xs outline-none border-2 border-transparent focus:border-blue-500 transition-all resize-none" placeholder="OBSERVAÇÕES ADICIONAIS" value={form.obs_indicacao} onChange={e => setForm({...form, obs_indicacao: e.target.value})} />
    </div>

    <button type="submit" disabled={enviando} className="w-full h-16 bg-blue-600 text-white rounded-xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-lg shadow-blue-100">
      {enviando ? <Loader2 className="animate-spin" /> : <Send size={18} />} ENVIAR PARA COTAÇÃO
    </button>
  </form>
);