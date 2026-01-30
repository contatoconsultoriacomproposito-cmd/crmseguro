import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Check, X, Palette, MoreVertical } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Props {
  fase: { id: string; title: string; colorHex: string };
  grupo: 'atendimento' | 'vendas' | 'perdas' | string;
  onUpdate: () => void;
}

const CORES_SUGERIDAS = ['#64748b', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#059669'];

export function MenuConfigColuna({ fase, grupo, onUpdate }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [novoNome, setNovoNome] = useState(fase.title);
  const [novaCor, setNovaCor] = useState(fase.colorHex);
  const [saving, setSaving] = useState(false);

  async function handleSalvar() {
    if (!novoNome.trim()) {
      toast.error('O nome da fase não pode estar vazio');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: perfil } = await supabase
        .from('usuarios_perfis')
        .select('corretora_id')
        .eq('id', user.id)
        .single();

      if (!perfil?.corretora_id) throw new Error('Corretora não identificada');

      const { error } = await supabase
        .from('tab_kanban_config')
        .update({ 
          nome_exibicao: novoNome, 
          cor_hex: novaCor 
        })
        .eq('corretora_id', perfil.corretora_id)
        .eq('fase_chave', fase.id)
        .eq('grupo', grupo);

      if (error) throw error;

      toast.success('Coluna atualizada!');
      setIsOpen(false);
      
      // O onUpdate recarrega o useKanbanConfig, que agora possui a 
      // lógica de ordenação (Lead > Contato > Negociação) que implementamos.
      onUpdate(); 
      
    } catch (error: any) {
      console.error('Erro ao salvar config:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <MoreVertical size={16} />
      </button>
    );
  }

  return (
    <div className="absolute z-50 mt-2 w-64 bg-white dark:bg-zinc-900 shadow-2xl rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 animate-in fade-in zoom-in duration-150 right-0">
      <div className="flex justify-between items-center mb-4">
        <span className="text-[10px] font-black uppercase text-slate-400">Editar Coluna</span>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold mb-1 ml-1 text-slate-500 dark:text-zinc-400">
            NOME DA FASE
          </label>
          <input 
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            className="w-full h-9 px-3 bg-slate-50 dark:bg-zinc-800 border-none rounded-xl text-xs font-bold outline-none ring-2 ring-transparent focus:ring-blue-500/20 text-slate-700 dark:text-zinc-200"
            placeholder="Ex: Lead, Contato..."
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold mb-1 ml-1 flex items-center gap-1 text-slate-500 dark:text-zinc-400">
            <Palette size={10} /> COR DO CABEÇALHO
          </label>
          <div className="flex flex-wrap gap-2">
            {CORES_SUGERIDAS.map(cor => (
              <button
                key={cor}
                type="button"
                onClick={() => setNovaCor(cor)}
                className={`w-6 h-6 rounded-full border-2 transition-transform active:scale-95 ${
                  novaCor === cor ? 'border-slate-400 scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: cor }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={handleSalvar}
          disabled={saving}
          className="w-full h-10 bg-slate-900 dark:bg-white dark:text-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {saving ? (
            'Salvando...'
          ) : (
            <>
              <Check size={14} /> Salvar Alterações
            </>
          )}
        </button>
      </div>
    </div>
  );
}