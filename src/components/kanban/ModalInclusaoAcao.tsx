import { useState } from 'react';
import { X, Calendar, Clock, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface ModalProps {
  clienteId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ModalInclusaoAcao = ({ clienteId, onClose, onSuccess }: ModalProps) => {
  const [loading, setLoading] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null); // Estado para mensagens de erro elegantes
  
  const [tipoAcao, setTipoAcao] = useState('');
  const [textoAcao, setTextoAcao] = useState('');
  const [dataRetorno, setDataRetorno] = useState('');
  const [horarioRetorno, setHorarioRetorno] = useState('');

  const tiposAcoes = [
    'WhatsApp', 'Ligação', 'E-mail', 
    'Reunião Online', 'Reunião Presencial (visita)', 
    'Cliente Visitou', 'Outros'
  ];

  async function handleSalvar() {
    // Validação visual em vez de alert
    if (!tipoAcao || !textoAcao) {
      setErro("Por favor, preencha o tipo e o relato da interação.");
      return;
    }
    
    setLoading(true);
    setErro(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: perfil } = await supabase
        .from('usuarios_perfis')
        .select('corretora_id')
        .eq('id', user.id)
        .single();

      // 1. SALVAR O HISTÓRICO NA TAB_INTERACOES
      const { error: errorInteracao } = await supabase
        .from('tab_interacoes')
        .insert([{
          cliente_id: clienteId,
          corretor_id: user.id,
          corretora_id: perfil?.corretora_id || user.id,
          tipo_acao: tipoAcao,
          relato: textoAcao,
          data_historico: new Date().toLocaleDateString('en-CA'),
          horario_historico: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }]);

      if (errorInteracao) throw errorInteracao;

      // 2. ATUALIZAR O COMPROMISSO FUTURO NA TAB_CLIENTES
      const { error: errorCliente } = await supabase
        .from('tab_clientes')
        .update({
          data_retorno: dataRetorno || null,
          horario_retorno: horarioRetorno || null,
          corretor_id: user.id,
          corretora_id: perfil?.corretora_id || user.id
        })
        .eq('id', clienteId);

      if (errorCliente) throw errorCliente;

      setSalvo(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);

    } catch (error: any) {
      console.error("Erro ao salvar:", error.message);
      setErro("Falha na comunicação com o banco: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[32px] shadow-2xl border border-white/20 overflow-hidden transition-all">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-lg font-black uppercase italic tracking-tighter text-slate-800 dark:text-white">Incluir Ação</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Registro de Evento Comercial</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {salvo ? (
          <div className="p-12 flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white">Ação Registrada!</h3>
            <p className="text-sm text-slate-500">O histórico foi atualizado com sucesso.</p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            
            {/* Mensagem de Erro Elegante */}
            {erro && (
              <div className="bg-red-50 border border-red-100 p-3 rounded-2xl flex items-center gap-3 text-red-600 animate-in slide-in-from-top-2">
                <AlertCircle size={18} className="shrink-0" />
                <p className="text-xs font-bold leading-tight">{erro}</p>
              </div>
            )}

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tipo de Ação</label>
              <select 
                value={tipoAcao}
                onChange={(e) => { setTipoAcao(e.target.value); setErro(null); }}
                className="w-full mt-1 bg-slate-100 dark:bg-zinc-800 border-none rounded-2xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              >
                <option value="">Selecione uma opção...</option>
                {tiposAcoes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Relato da Interação</label>
              <textarea 
                value={textoAcao}
                onChange={(e) => { setTextoAcao(e.target.value); setErro(null); }}
                rows={3}
                placeholder="O que aconteceu nesta conversa?"
                onKeyDown={(e) => { if (e.key === ' ') e.stopPropagation(); }}
                className="w-full mt-1 bg-slate-100 dark:bg-zinc-800 border-none rounded-2xl p-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-1">
                  <Calendar size={10} /> Data Retorno
                </label>
                <input 
                  type="date"
                  value={dataRetorno}
                  onChange={(e) => setDataRetorno(e.target.value)}
                  className="w-full mt-1 bg-slate-100 dark:bg-zinc-800 border-none rounded-2xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-1">
                  <Clock size={10} /> Horário Retorno
                </label>
                <input 
                  type="time"
                  value={horarioRetorno}
                  onChange={(e) => setHorarioRetorno(e.target.value)}
                  className="w-full mt-1 bg-slate-100 dark:bg-zinc-800 border-none rounded-2xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <button 
              onClick={handleSalvar}
              disabled={loading}
              className="w-full bg-slate-900 dark:bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 dark:hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando...
                </div>
              ) : (
                <><Save size={16} /> Salvar Ação</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};