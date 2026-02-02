// src/pages/portal/components/FormIndicacao.tsx
import { useState, useEffect } from "react";
import { 
  User, ShieldCheck, Phone, ChevronRight, 
  MessageSquare, Send, Loader2, ClipboardList, Check 
} from "lucide-react";
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

export const FormIndicacao = ({ form, setForm, produtos, documentos, setDocumentos, enviando, onSubmit }: FormProps) => {
  
  const [dadosAuto, setDadosAuto] = useState<any>({
    idade: "", sexo: "", estadoCivil: "", profissao: "",
    sinistro: "Não", uso: "Particular", km: "", condutorAdicional: "Não",
    idadeAdicional: "", garagemTrabalho: "", garagemResidencia: "",
    coberturas: [] as string[], assistencias: [] as string[],
    franquia: "Normal", danosMateriais: "", danosCorporais: "",
    carroReserva: "Não", guincho: "", bonus: "0", dispositivos: [] as string[]
  });

  // Função para aplicar pacotes pré-definidos (Acelerador)
  const aplicarPacote = (tipo: 'BASICO' | 'INTERMEDIARIO' | 'COMPLETO') => {
    const pacotes = {
      BASICO: {
        coberturas: ['Roubo', 'Furto'],
        assistencias: ['Chaveiro', 'Pneu'],
        franquia: 'Normal', guincho: 'Até 100km', carroReserva: 'Não',
        danosMateriais: 'Até 50 mil', danosCorporais: 'Até 50 mil'
      },
      INTERMEDIARIO: {
        coberturas: ['Roubo', 'Furto', 'Colisão Terceiros', 'Enchente e Incêndio'],
        assistencias: ['Chaveiro', 'Pneu', 'Pane Seca'],
        franquia: 'Reduzida', guincho: 'Até 400km', carroReserva: '7 dias',
        danosMateriais: 'Até 100 mil', danosCorporais: 'Até 100 mil'
      },
      COMPLETO: {
        coberturas: ['Roubo', 'Furto', 'Colisão Própria', 'Colisão Terceiros', 'Enchente e Incêndio'],
        assistencias: ['Chaveiro', 'Pneu', 'Pane Seca', 'Vidros, faróis, lanternas e retrovisores'],
        franquia: 'Reduzida', guincho: 'Ilimitado', carroReserva: '30 dias',
        danosMateriais: 'Acima de 100 mil', danosCorporais: 'Acima de 100 mil'
      }
    };
    setDadosAuto({ ...dadosAuto, ...pacotes[tipo] });
  };

  useEffect(() => {
    if (form.produto_interesse === "SEGURO AUTO") {
      const textoGerado = `
--- QUESTIONÁRIO SEGURO AUTO ---
1. Idade Condutor: ${dadosAuto.idade || 'N/I'}
2. Sexo: ${dadosAuto.sexo || 'N/I'}
3. Estado Civil: ${dadosAuto.estadoCivil || 'N/I'}
4. Profissão: ${dadosAuto.profissao || 'N/I'}
5. Histórico Sinistro: ${dadosAuto.sinistro}
6. Tipo de Uso: ${dadosAuto.uso}
7. KM Média Mensal: ${dadosAuto.km || 'N/I'}
8. Condutores Adicionais: ${dadosAuto.condutorAdicional} ${dadosAuto.condutorAdicional === 'Sim' ? `(Idade: ${dadosAuto.idadeAdicional})` : ''}
9. Garagem Trabalho: ${dadosAuto.garagemTrabalho || 'N/I'}
10. Garagem Residência: ${dadosAuto.garagemResidencia || 'N/I'}
11. Coberturas: ${dadosAuto.coberturas.join(", ") || 'Nenhum'} | Assistências: ${dadosAuto.assistencias.join(", ") || 'Nenhum'}
12. Franquia: ${dadosAuto.franquia}
13. Danos Materiais: ${dadosAuto.danosMateriais || 'N/I'}
14. Danos Corporais: ${dadosAuto.danosCorporais || 'N/I'}
15. Carro Reserva: ${dadosAuto.carroReserva}
16. Guincho: ${dadosAuto.guincho || 'N/I'}
17. Classe de Bônus: ${dadosAuto.bonus}
18. Dispositivos Segurança: ${dadosAuto.dispositivos.join(", ") || 'Nenhum'}
-------------------------------
`.trim();
      setForm({ ...form, obs_indicacao: textoGerado });
    }
  }, [dadosAuto, form.produto_interesse]);

  const toggleItem = (field: string, value: string) => {
    setDadosAuto((prev: any) => ({
      ...prev,
      [field]: prev[field].includes(value) ? prev[field].filter((i: string) => i !== value) : [...prev[field], value]
    }));
  };

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 space-y-4">
      {/* CAMPOS PADRÃO */}
      <div className="space-y-4">
        {/* NOME DO CLIENTE */}
        <div className="relative">
          <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input 
            required 
            className="w-full h-14 pl-14 pr-5 rounded-xl bg-slate-50 font-bold text-xs outline-none border-2 border-transparent focus:border-blue-500 transition-all uppercase" 
            placeholder="NOME DO CLIENTE" 
            value={form.nome_cliente} 
            onChange={e => setForm({...form, nome_cliente: e.target.value.toUpperCase()})} 
          />
        </div>

        {/* NOVO: EMAIL DO CLIENTE */}
        <div className="relative">
          <Send className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 -rotate-45" size={18} />
          <input 
            type="email"
            required 
            className="w-full h-14 pl-14 pr-5 rounded-xl bg-slate-50 font-bold text-xs outline-none border-2 border-transparent focus:border-blue-500 transition-all" 
            placeholder="E-MAIL DO CLIENTE" 
            value={form.email_cliente || ''} 
            onChange={e => setForm({...form, email_cliente: e.target.value.toLowerCase()})} 
          />
        </div>

        {/* DOCUMENTO E WHATSAPP EM DUAS COLUNAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              required 
              className="w-full h-14 pl-14 pr-5 rounded-xl bg-slate-50 font-bold text-xs outline-none border-2 border-transparent focus:border-blue-500 transition-all" 
              placeholder="CPF OU CNPJ" 
              value={form.documento_cliente || ''} 
              onChange={e => {
                const val = e.target.value.replace(/\D/g, "");
                setForm({
                  ...form, 
                  documento_cliente: val.length <= 11 ? maskCPF(val) : maskCNPJ(val)
                });
              }} 
              maxLength={18} 
            />
          </div>
          <div className="relative">
            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              required 
              className="w-full h-14 pl-14 pr-5 rounded-xl bg-slate-50 font-bold text-xs outline-none border-2 border-transparent focus:border-blue-500 transition-all" 
              placeholder="WHATSAPP" 
              value={form.telefone_cliente} 
              onChange={e => setForm({...form, telefone_cliente: maskPhone(e.target.value)})} 
            />
          </div>
        </div>
      </div>

      <div className="relative">
        <select required className="w-full h-14 px-5 rounded-xl bg-slate-50 font-bold text-xs appearance-none outline-none border-2 border-transparent focus:border-blue-500 transition-all cursor-pointer text-blue-600" value={form.produto_interesse} onChange={e => setForm({...form, produto_interesse: e.target.value})}>
          <option value="">PRODUTO DE INTERESSE...</option>
          {produtos.map((p, idx) => <option key={idx} value={p.nome}>{p.nome}</option>)}
        </select>
        <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 rotate-90" size={18} />
      </div>

      {/* QUESTIONÁRIO 18 ITENS - SEGURO AUTO */}
      {form.produto_interesse === "SEGURO AUTO" && (
        <div className="p-6 bg-slate-50 rounded-[2rem] border-2 border-blue-100 space-y-8 animate-in slide-in-from-top-4 duration-500">
          
          {/* ACELERADORES DE PACOTE */}
          <div className="flex flex-col gap-3">
            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest text-center">Preenchimento Rápido (Pacotes)</span>
            <div className="flex gap-2">
              {(['BASICO', 'INTERMEDIARIO', 'COMPLETO'] as const).map(p => (
                <button type="button" key={p} onClick={() => aplicarPacote(p)} className="flex-1 py-2 bg-white border border-blue-200 rounded-lg text-[9px] font-black hover:bg-blue-600 hover:text-white transition-all shadow-sm uppercase">{p}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Idade */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase">1. Idade Principal Condutor</label>
              <select className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white font-bold text-[10px]" value={dadosAuto.idade} onChange={e => setDadosAuto({...dadosAuto, idade: e.target.value})}>
                <option value="">SELECIONE...</option>
                {['18–25 anos', '26–35 anos', '36–60 anos', '+60 anos'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            {/* 2. Sexo */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase">2. Sexo</label>
              <div className="flex gap-2">
                {['Masculino', 'Feminino'].map(v => (
                  <button type="button" key={v} onClick={() => setDadosAuto({...dadosAuto, sexo: v})} className={`flex-1 h-11 rounded-xl text-[10px] font-black transition-all ${dadosAuto.sexo === v ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200'}`}>{v}</button>
                ))}
              </div>
            </div>

            {/* 3. Estado Civil */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase">3. Estado Civil</label>
              <select className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white font-bold text-[10px]" value={dadosAuto.estadoCivil} onChange={e => setDadosAuto({...dadosAuto, estadoCivil: e.target.value})}>
                <option value="">SELECIONE...</option>
                {['Solteiro', 'Casado / união estável'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            {/* 4. Profissão */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase">4. Profissão</label>
              <select className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white font-bold text-[10px]" value={dadosAuto.profissao} onChange={e => setDadosAuto({...dadosAuto, profissao: e.target.value})}>
                <option value="">SELECIONE...</option>
                {['CLT', 'Funcionário Público', 'Autônomo', 'Representante Comercial', 'Empresário', 'Outros'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            {/* 5. Sinistro */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase">5. Histórico de Sinistros</label>
              <div className="flex gap-2">
                {['Sim', 'Não'].map(v => (
                  <button type="button" key={v} onClick={() => setDadosAuto({...dadosAuto, sinistro: v})} className={`flex-1 h-11 rounded-xl text-[10px] font-black transition-all ${dadosAuto.sinistro === v ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>{v}</button>
                ))}
              </div>
            </div>

            {/* 6. Tipo de Uso */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase">6. Tipo de Uso</label>
              <div className="flex gap-2">
                {['Particular', 'Comercial'].map(v => (
                  <button type="button" key={v} onClick={() => setDadosAuto({...dadosAuto, uso: v})} className={`flex-1 h-11 rounded-xl text-[10px] font-black transition-all ${dadosAuto.uso === v ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>{v}</button>
                ))}
              </div>
            </div>

            {/* 7. KM */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase">7. Quilometragem Média Mensal</label>
              <select className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white font-bold text-[10px]" value={dadosAuto.km} onChange={e => setDadosAuto({...dadosAuto, km: e.target.value})}>
                <option value="">SELECIONE...</option>
                {['Até 500 km', 'De 501 a 1000 km', 'De 1001 a 2000 km', 'Acima de 2000 km'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            {/* 8. Condutores Adicionais */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase">8. Condutores Adicionais</label>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  {['Sim', 'Não'].map(v => (
                    <button type="button" key={v} onClick={() => setDadosAuto({...dadosAuto, condutorAdicional: v})} className={`flex-1 h-11 rounded-xl text-[10px] font-black transition-all ${dadosAuto.condutorAdicional === v ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>{v}</button>
                  ))}
                </div>
                {dadosAuto.condutorAdicional === 'Sim' && (
                  <select className="w-full h-10 px-4 rounded-xl border border-blue-200 bg-white font-bold text-[10px] animate-in fade-in" value={dadosAuto.idadeAdicional} onChange={e => setDadosAuto({...dadosAuto, idadeAdicional: e.target.value})}>
                    <option value="">IDADE DO ADICIONAL...</option>
                    {['18–25 anos', '26–35 anos', '36–60 anos', '+60 anos'].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                )}
              </div>
            </div>

            {/* 9 e 10. Garagens */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase">9. Local de Trabalho</label>
              <select className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white font-bold text-[10px]" value={dadosAuto.garagemTrabalho} onChange={e => setDadosAuto({...dadosAuto, garagemTrabalho: e.target.value})}>
                <option value="">SELECIONE...</option>
                {['É garagem coberta', 'É estacionamento', 'Não tem garagem ou estacionamento'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase">10. Local de Residência</label>
              <select className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white font-bold text-[10px]" value={dadosAuto.garagemResidencia} onChange={e => setDadosAuto({...dadosAuto, garagemResidencia: e.target.value})}>
                <option value="">SELECIONE...</option>
                {['É garagem coberta', 'É estacionamento', 'Não tem garagem ou estacionamento'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* 11. Coberturas e Assistências */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
             <label className="text-[9px] font-black text-blue-600 uppercase italic">11. Coberturas e Assistências (Toque para marcar)</label>
             <div className="flex flex-wrap gap-2">
                {['Roubo', 'Furto', 'Colisão Própria', 'Colisão Terceiros', 'Enchente e Incêndio'].map(c => (
                  <button type="button" key={c} onClick={() => toggleItem('coberturas', c)} className={`px-3 py-2 rounded-lg text-[9px] font-bold border transition-all flex items-center gap-1.5 ${dadosAuto.coberturas.includes(c) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
                    {dadosAuto.coberturas.includes(c) && <Check size={10} />} {c}
                  </button>
                ))}
             </div>
             <div className="flex flex-wrap gap-2">
                {['Chaveiro', 'Troca de pneu', 'Pane Seca', 'Vidros, faróis, lanternas e retrovisores'].map(a => (
                  <button type="button" key={a} onClick={() => toggleItem('assistencias', a)} className={`px-3 py-2 rounded-lg text-[9px] font-bold border transition-all flex items-center gap-1.5 ${dadosAuto.assistencias.includes(a) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
                    {dadosAuto.assistencias.includes(a) && <Check size={10} />} {a}
                  </button>
                ))}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 12. Franquia */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase">12. Tipo de Franquia</label>
              <div className="flex gap-1">
                {['Normal', 'Reduzida', 'Aumentada'].map(v => (
                  <button type="button" key={v} onClick={() => setDadosAuto({...dadosAuto, franquia: v})} className={`flex-1 h-10 rounded-lg text-[9px] font-black transition-all ${dadosAuto.franquia === v ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-400'}`}>{v}</button>
                ))}
              </div>
            </div>

            {/* 13. Danos Materiais */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase">13. Valor Danos Materiais</label>
              <select className="w-full h-10 px-4 rounded-xl border border-slate-200 bg-white font-bold text-[10px]" value={dadosAuto.danosMateriais} onChange={e => setDadosAuto({...dadosAuto, danosMateriais: e.target.value})}>
                <option value="">SELECIONE...</option>
                {['Sem cobertura de danos materiais', 'Até 50 mil', 'Até 100 mil', 'Acima de 100 mil'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            {/* 14. Danos Corporais */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase">14. Valor Danos Corporais</label>
              <select className="w-full h-10 px-4 rounded-xl border border-slate-200 bg-white font-bold text-[10px]" value={dadosAuto.danosCorporais} onChange={e => setDadosAuto({...dadosAuto, danosCorporais: e.target.value})}>
                <option value="">SELECIONE...</option>
                {['Sem cobertura de danos corporais', 'Até 50 mil', 'Até 100 mil', 'Acima de 100 mil'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            {/* 15. Carro Reserva */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase">15. Carro Reserva</label>
              <select className="w-full h-10 px-4 rounded-xl border border-slate-200 bg-white font-bold text-[10px]" value={dadosAuto.carroReserva} onChange={e => setDadosAuto({...dadosAuto, carroReserva: e.target.value})}>
                {['Não', '7 dias', '15 dias', '30 dias'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            {/* 16. Guincho */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase">16. Guincho</label>
              <select className="w-full h-10 px-4 rounded-xl border border-slate-200 bg-white font-bold text-[10px]" value={dadosAuto.guincho} onChange={e => setDadosAuto({...dadosAuto, guincho: e.target.value})}>
                <option value="">SELECIONE...</option>
                {['Sem guincho', 'Até 100km', 'Até 200km', 'Até 400km', 'Ilimitado'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            {/* 17. Classe Bônus */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase">17. Classe de Bônus (0 a 10)</label>
              <input type="range" min="0" max="10" step="1" className="w-full h-10 accent-blue-600" value={dadosAuto.bonus} onChange={e => setDadosAuto({...dadosAuto, bonus: e.target.value})} />
              <div className="text-center font-black text-[10px] text-blue-600 mt-[-8px]">CLASSE: {dadosAuto.bonus}</div>
            </div>
          </div>

          {/* 18. Dispositivos */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
             <label className="text-[9px] font-black text-slate-400 uppercase">18. Dispositivos de Segurança</label>
             <div className="flex gap-2">
                {['Rastreador', 'Bloqueador', 'Alarme'].map(d => (
                  <button type="button" key={d} onClick={() => toggleItem('dispositivos', d)} className={`flex-1 h-10 rounded-lg text-[10px] font-black border transition-all ${dadosAuto.dispositivos.includes(d) ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 border-slate-200'}`}>{d}</button>
                ))}
             </div>
          </div>
        </div>
      )}

      <UploadArea documentos={documentos} setDocumentos={setDocumentos} />

      <div className="relative">
        <MessageSquare className="absolute left-5 top-4 text-slate-300" size={18} />
        <textarea rows={form.produto_interesse === "SEGURO AUTO" ? 10 : 3} className="w-full pl-14 pr-5 py-4 rounded-xl bg-slate-50 font-bold text-xs outline-none border-2 border-transparent focus:border-blue-500 transition-all resize-none" placeholder="OBSERVAÇÕES ADICIONAIS" value={form.obs_indicacao} onChange={e => setForm({...form, obs_indicacao: e.target.value})} />
        {form.produto_interesse === "SEGURO AUTO" && <div className="absolute top-4 right-4"><ClipboardList size={16} className="text-blue-500 opacity-50" /></div>}
      </div>

      <button type="submit" disabled={enviando} className="w-full h-16 bg-blue-600 text-white rounded-xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-lg shadow-blue-100">
        {enviando ? <Loader2 className="animate-spin" /> : <Send size={18} />} ENVIAR PARA COTAÇÃO
      </button>
    </form>
  );
};