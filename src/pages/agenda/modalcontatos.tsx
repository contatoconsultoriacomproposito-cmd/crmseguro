import { useState } from 'react';
import { X, Phone, MessageCircle, Calendar, Save, CheckCircle, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface ModalContatoProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: any;
  onSuccess: () => void; // Para recarregar a agenda após salvar
}

export default function ModalContato({ isOpen, onClose, cliente, onSuccess }: ModalContatoProps) {
  const [loading, setLoading] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Estados do formulário (Lógica vinda do seu ModalInclusaoAcao)
  const [tipoAcao, setTipoAcao] = useState('');
  const [textoAcao, setTextoAcao] = useState('');
  const [dataRetorno, setDataRetorno] = useState('');
  const [horarioRetorno, setHorarioRetorno] = useState('');

  if (!isOpen || !cliente) return null;

  const tiposAcoes = ['WhatsApp', 'Ligação', 'E-mail', 'Reunião Online', 'Reunião Presencial (visita)', 'Outros'];

  async function handleSalvarAcao() {
    if (!tipoAcao || !textoAcao) {
      setErro("Preencha o tipo e o relato da interação.");
      return;
    }

    setLoading(true);
    setErro(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Busca corretora_id do perfil
      const { data: perfil } = await supabase
        .from('usuarios_perfis')
        .select('corretora_id')
        .eq('id', user.id)
        .single();

      // 1. Grava na tab_interacoes (Histórico)
      const { error: errorInteracao } = await supabase
        .from('tab_interacoes')
        .insert([{
          cliente_id: cliente.id,
          corretor_id: user.id,
          corretora_id: perfil?.corretora_id || user.id,
          tipo_acao: tipoAcao,
          relato: textoAcao,
          data_historico: new Date().toLocaleDateString('en-CA'),
          horario_historico: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }]);

      if (errorInteracao) throw errorInteracao;

      // 2. Atualiza a tab_clientes com o NOVO agendamento futuro
      const { error: errorCliente } = await supabase
        .from('tab_clientes')
        .update({
          data_retorno: dataRetorno || null,
          horario_retorno: horarioRetorno || null,
        })
        .eq('id', cliente.id);

      if (errorCliente) throw errorCliente;

      setSalvo(true);
      setTimeout(() => {
        setSalvo(false);
        setTipoAcao('');
        setTextoAcao('');
        onSuccess(); // Recarrega os eventos na Agenda
        onClose();
      }, 1500);

    } catch (error: any) {
      setErro("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[32px] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-800/50">
          <div>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest">
              {cliente.fase_kanban || 'LEAD'}
            </span>
            <h2 className="text-xl font-black text-slate-800 dark:text-white mt-1">
              {cliente.tipo_cliente === 'PJ' ? cliente.razao_social : cliente.nome}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          {salvo ? (
            <div className="py-12 flex flex-col items-center justify-center text-center animate-in zoom-in">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white">Sucesso!</h3>
              <p className="text-sm text-slate-500">Interação salva e agenda atualizada.</p>
            </div>
          ) : (
            <>
              {/* BOTÕES DE AÇÃO RÁPIDA (CONTATO DIRETO) */}
              <div className="grid grid-cols-2 gap-3">
                <a href={`https://wa.me/55${cliente.telefone_whats?.replace(/\D/g, '')}`} target="_blank" className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-50 text-emerald-600 font-bold text-sm border border-emerald-100 hover:bg-emerald-100 transition-all">
                  <MessageCircle size={18} /> WhatsApp
                </a>
                <a href={`tel:${cliente.telefone_whats}`} className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-blue-50 text-blue-600 font-bold text-sm border border-blue-100 hover:bg-blue-100 transition-all">
                  <Phone size={18} /> Ligar
                </a>
              </div>

              <div className="h-px bg-slate-100 dark:bg-zinc-800" />

              {/* FORMULÁRIO DE NOVA INTERAÇÃO (INTEGRADO) */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
                  <MessageSquare size={14} /> Registrar o que aconteceu:
                </h4>
                
                {erro && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold">{erro}</div>}

                <div className="grid grid-cols-2 gap-3">
                   <div className="col-span-2">
                      <select 
                        value={tipoAcao}
                        onChange={(e) => setTipoAcao(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-zinc-800 border-none rounded-2xl p-3 text-sm font-bold outline-none"
                      >
                        <option value="">Tipo de Interação...</option>
                        {tiposAcoes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                   </div>
                   <textarea 
                    value={textoAcao}
                    onChange={(e) => setTextoAcao(e.target.value)}
                    placeholder="Relate brevemente a conversa..."
                    className="col-span-2 w-full bg-slate-100 dark:bg-zinc-800 border-none rounded-2xl p-3 text-sm min-h-[80px] outline-none"
                  />
                </div>

                <h4 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2 pt-2">
                  <Calendar size={14} /> Agendar Próximo Contato:
                </h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" value={dataRetorno} onChange={(e) => setDataRetorno(e.target.value)} className="bg-slate-100 dark:bg-zinc-800 border-none rounded-2xl p-3 text-sm font-bold outline-none" />
                  <input type="time" value={horarioRetorno} onChange={(e) => setHorarioRetorno(e.target.value)} className="bg-slate-100 dark:bg-zinc-800 border-none rounded-2xl p-3 text-sm font-bold outline-none" />
                </div>

                <button 
                  onClick={handleSalvarAcao}
                  disabled={loading}
                  className="w-full bg-slate-900 dark:bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  {loading ? "Salvando..." : <><Save size={16} /> Salvar e Atualizar Agenda</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}