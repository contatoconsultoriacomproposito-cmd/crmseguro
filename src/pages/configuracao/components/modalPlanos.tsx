import { useState, useMemo } from 'react';
import { X, Zap, ShoppingCart, Loader2, MessageCircle, ShieldCheck, Database, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { toast } from 'sonner';
import { useAuth } from '../../../auth/AuthContext';

interface ModalPlanosProps {
  isOpen: boolean;
  onClose: () => void;
  planoAtual?: string;
}

const PLANOS_CONFIG = {
  mensal: {
    nome: "Mensal",
    meses: 1,
    valorBase: 89.97,
  },
  trimestral: {
    nome: "Trimestral",
    meses: 3,
    valorBase: 79.97,
  },
  semestral: {
    nome: "Semestral",
    meses: 6,
    valorBase: 69.97,
  },
  anual: {
    nome: "Anual",
    meses: 12,
    valorBase: 49.97,
  }
};

const STORAGE_OPTIONS = [
  { mb: 50, preco: 0, label: "50 MB (Incluso)" },
  { mb: 100, preco: 75.00, label: "100 MB" },
  { mb: 200, preco: 120.00, label: "200 MB" },
  { mb: 500, preco: 250.00, label: "500 MB" },
];

export function ModalPlanos({ isOpen, onClose, planoAtual }: ModalPlanosProps) {
  const { userProfile } = useAuth();
  const [planoSel, setPlanoSel] = useState<keyof typeof PLANOS_CONFIG>("mensal");
  const [storageSel, setStorageSel] = useState(STORAGE_OPTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const calculo = useMemo(() => {
    const config = PLANOS_CONFIG[planoSel];
    const valorStorageNoMes = storageSel.preco;
    
    const valorAssinaturaMes = config.valorBase + valorStorageNoMes;
    const totalImediato = valorAssinaturaMes * config.meses;

    return {
      valorAssinaturaMes,
      totalImediato,
      valorStorageTotal: valorStorageNoMes * config.meses,
      config
    };
  }, [planoSel, storageSel]);

  const handleFinalizarPedido = async () => {
    setLoading(true);
    try {
      if (!userProfile?.corretora_id) {
        toast.error("Erro: Perfil da corretora não identificado.");
        return;
      }

      // Registro simplificado: Site e Usuários já inclusos por padrão no novo modelo
      const { error: dbError } = await supabase
        .from('tab_planos')
        .insert([{
          corretora_id: userProfile.corretora_id,
          plano_nome: calculo.config.nome.toUpperCase(),
          periodicidade: planoSel,
          valor_total: calculo.totalImediato,
          qtd_usuarios_adicionais: 999, // Representa ilimitado
          possui_site: true,
          possui_manychat: true,
          storage_limite_mb: storageSel.mb,
          storage_max_file_size_mb: 10, 
          data_fim: new Date(new Date().setMonth(new Date().getMonth() + calculo.config.meses)).toISOString(),
          status_assinatura: 'PENDENTE_WHATSAPP'
        }]);

      if (dbError) throw dbError;

      const msg = `*NOVO PEDIDO: PLANO TUDO INCLUSO* 🚀
---------------------------------------
*Corretora:* ${userProfile.nome_corretora || 'N/A'}
*ID:* ${userProfile.corretora_id}

*DETALHES DA ASSINATURA:*
- Plano: *${calculo.config.nome.toUpperCase()}*
- Ciclo: ${calculo.config.meses} mês(es)
- Usuários: *ILIMITADOS* ✅
- Site + IA ChatSDR: *INCLUSO* ✅
- Armazenamento: *${storageSel.label}*

*VALOR TOTAL:* R$ ${calculo.totalImediato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
---------------------------------------
_Olá Bruce! Gostaria de ativar meu SeguroCRM com Site e IA integrados._`;

      const whatsappUrl = `https://wa.me/5548996461645?text=${encodeURIComponent(msg)}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      
      onClose();
      setShowConfirm(false);

    } catch (error: any) {
      console.error('Erro:', error.message);
      toast.error("Erro ao gerar pedido.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-white dark:bg-zinc-950 w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-[40px] shadow-2xl border border-slate-200 dark:border-zinc-800">
          
          <div className="sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md p-6 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center z-10">
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="text-yellow-500" fill="currentColor" size={24} /> 
                SeguroCRM Profissional
              </h2>
              <p className="text-slate-500 text-sm">CRM + Site + IA ChatSDR em um único plano.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <X size={24} className="text-slate-400" />
            </button>
          </div>

          <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-8">
              
              <section>
                <label className="text-xs font-black uppercase text-slate-400 mb-4 block ml-1 tracking-widest">1. Escolha o Ciclo</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(Object.keys(PLANOS_CONFIG) as Array<keyof typeof PLANOS_CONFIG>).map((key) => {
                    const isPlanoAtivo = planoAtual?.toUpperCase() === key.toUpperCase();
                    return (
                      <button
                        key={key}
                        onClick={() => !isPlanoAtivo && setPlanoSel(key)}
                        disabled={isPlanoAtivo}
                        className={`p-4 rounded-2xl border-2 transition-all text-center relative ${
                          isPlanoAtivo 
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 cursor-default' 
                            : planoSel === key 
                              ? 'border-blue-600 bg-blue-50 dark:bg-blue-500/10 text-blue-600 shadow-md' 
                              : 'border-slate-100 dark:border-zinc-800 text-slate-500 hover:border-slate-200'
                        }`}
                      >
                        <span className="block font-bold text-sm">{PLANOS_CONFIG[key].nome}</span>
                        <span className="text-[10px] font-black">R$ {PLANOS_CONFIG[key].valorBase}/mês</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="p-6 bg-slate-50 dark:bg-zinc-900/50 rounded-[32px] border border-slate-100 dark:border-zinc-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-600">
                    <Database size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Espaço de Armazenamento</h4>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Documentos, Fotos e Dados da IA</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STORAGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.mb}
                      onClick={() => setStorageSel(opt)}
                      className={`p-3 rounded-xl border-2 text-[11px] font-bold transition-all ${
                        storageSel.mb === opt.mb 
                        ? 'border-indigo-500 bg-white dark:bg-zinc-800 text-indigo-600 shadow-sm' 
                        : 'border-transparent text-slate-400 hover:bg-white/50'
                      }`}
                    >
                      {opt.label}
                      <span className="block text-[9px] opacity-60">
                        {opt.preco === 0 ? 'Grátis' : `+ R$ ${opt.preco}/mês`}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 flex items-center gap-3">
                  <Check className="text-emerald-500" size={18} />
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Usuários Ilimitados</span>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/20 flex items-center gap-3">
                  <Check className="text-blue-500" size={18} />
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400">Site + IA ChatSDR</span>
                </div>
              </section>
            </div>

            <div className="lg:col-span-5">
              <div className="bg-slate-900 dark:bg-zinc-900 rounded-[32px] p-8 text-white sticky top-24 shadow-2xl border border-white/5">
                <h4 className="font-bold text-slate-400 uppercase text-[10px] tracking-[0.3em] mb-6">Resumo da Assinatura</h4>
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Plano Profissional ({calculo.config.meses}x)</span>
                    <span className="font-bold">R$ {(calculo.config.valorBase * calculo.config.meses).toFixed(2)}</span>
                  </div>
                  {storageSel.preco > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-indigo-400">Adicional Storage ({storageSel.mb}MB)</span>
                      <span className="font-bold">R$ {calculo.valorStorageTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-emerald-400 pt-2 border-t border-white/5">
                    <span>Site + CRM Integrados</span>
                    <span className="font-black uppercase">Incluso</span>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-6 mb-8">
                  <p className="text-[10px] text-slate-400 uppercase font-black mb-1 tracking-widest">Investimento Total</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white">R$ {calculo.totalImediato.toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-blue-400 mt-2 font-medium italic">
                    * Equivalente a R$ {calculo.valorAssinaturaMes.toFixed(2)}/mês
                  </p>
                </div>

                <button 
                  onClick={() => setShowConfirm(true)}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-900/40 group"
                >
                  <ShoppingCart size={20} className="group-hover:scale-110 transition-transform" />
                  Contratar Agora
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in zoom-in duration-200">
          <div className="bg-white dark:bg-zinc-950 w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-slate-200 dark:border-zinc-800 text-center">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
              <ShieldCheck size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 italic uppercase tracking-tighter">Tudo pronto!</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-8">
              Ao clicar abaixo, você será enviado ao WhatsApp para ativação imediata do seu **Site com IA** e espaço de armazenamento.
            </p>
            <div className="space-y-3">
              <button onClick={handleFinalizarPedido} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all">
                {loading ? <Loader2 className="animate-spin" /> : <><MessageCircle size={20} /> INICIAR NO WHATSAPP</>}
              </button>
              <button onClick={() => setShowConfirm(false)} className="w-full text-slate-400 py-2 text-xs font-bold uppercase hover:text-slate-600">Revisar Pedido</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}