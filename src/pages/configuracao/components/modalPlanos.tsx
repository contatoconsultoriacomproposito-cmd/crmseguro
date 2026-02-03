import { useState, useMemo } from 'react';
import { X, UserPlus, Minus, Plus, Globe, Check, Zap, ShoppingCart, BotMessageSquare, Info, MessageCircle, ShieldCheck } from 'lucide-react';
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
    valorBase: 119.97,
    valorAdd: 69.97,
    siteMensal: 300.00,
    manychatMensal: 300.00
  },
  trimestral: {
    nome: "Trimestral",
    meses: 3,
    valorBase: 109.97,
    valorAdd: 59.97,
    siteMensal: 250.00,
    manychatMensal: 250.00
  },
  semestral: {
    nome: "Semestral",
    meses: 6,
    valorBase: 99.97,
    valorAdd: 49.97,
    siteMensal: 200.00,
    manychatMensal: 200.00
  },
  anual: {
    nome: "Anual",
    meses: 12,
    valorBase: 79.97,
    valorAdd: 39.97,
    siteMensal: 150.00,
    manychatMensal: 150.00
  }
};

export function ModalPlanos({ isOpen, onClose, planoAtual }: ModalPlanosProps) {
  const { userProfile } = useAuth();
  const [planoSel, setPlanoSel] = useState<keyof typeof PLANOS_CONFIG>("mensal");
  const [usuariosAdd, setUsuariosAdd] = useState(0);
  const [querSite, setQuerSite] = useState(false);
  const [querManychat, setQuerManychat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false); // Novo estado para o modal de segurança

  const calculo = useMemo(() => {
    const config = PLANOS_CONFIG[planoSel];
    const valorSiteNoMes = querSite ? config.siteMensal : 0;
    const valorManychatNoMes = querManychat ? config.manychatMensal : 0;
    
    const valorAssinaturaMes = config.valorBase + (usuariosAdd * config.valorAdd) + valorSiteNoMes + valorManychatNoMes;
    const totalImediato = valorAssinaturaMes * config.meses;

    return {
      valorAssinaturaMes,
      totalImediato,
      valorSiteTotal: valorSiteNoMes * config.meses,
      valorManychatTotal: valorManychatNoMes * config.meses,
      config
    };
  }, [planoSel, usuariosAdd, querSite, querManychat]);

  const handleFinalizarPedido = async () => {
    setLoading(true);
    try {
      if (!userProfile?.corretora_id) {
        toast.error("Erro: Perfil da corretora não identificado.");
        return;
      }

      // 1. Registra no banco de dados
      const { error: dbError } = await supabase
        .from('tab_planos')
        .insert([{
          corretora_id: userProfile.corretora_id,
          plano_nome: calculo.config.nome.toUpperCase(),
          periodicidade: planoSel,
          valor_total: calculo.totalImediato,
          qtd_usuarios_adicionais: usuariosAdd,
          possui_site: querSite,
          possui_manychat: querManychat,
          data_fim: new Date(new Date().setMonth(new Date().getMonth() + calculo.config.meses)).toISOString(),
          status_assinatura: 'PENDENTE_WHATSAPP'
        }]);

      if (dbError) throw dbError;

      // 2. Monta a mensagem para o WhatsApp
      const msg = `*NOVO PEDIDO DE ASSINATURA* 🚀
---------------------------------------
*Cliente:* ${userProfile.nome_completo || 'Corretor'}
*Corretora:* ${userProfile.nome_corretora || 'N/A'} (ID: ${userProfile.corretora_id})

*PLANO ESCOLHIDO:*
- *${calculo.config.nome.toUpperCase()}* (${calculo.config.meses} meses)

*DETALHES:*
- Usuários Extras: ${usuariosAdd}
- Site Premium: ${querSite ? '✅ Sim' : '❌ Não'}
- Gestão Manychat: ${querManychat ? '✅ Sim' : '❌ Não'}

*INVESTIMENTO TOTAL:* R$ ${calculo.totalImediato.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
---------------------------------------
_Olá! Gostaria de finalizar o pagamento da minha assinatura._`;

      const whatsappUrl = `https://wa.me/5548996461645?text=${encodeURIComponent(msg)}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      
      onClose(); // Fecha o modal principal
      setShowConfirm(false);

    } catch (error: any) {
      console.error('Erro no processamento:', error.message);
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
                Finalize sua Assinatura
              </h2>
              <p className="text-slate-500 text-sm">Escolha os recursos e ative via WhatsApp.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <X size={24} className="text-slate-400" />
            </button>
          </div>

          <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              
              <section>
                <label className="text-xs font-black uppercase text-slate-400 mb-4 block ml-1">1. Ciclo de Pagamento</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(Object.keys(PLANOS_CONFIG) as Array<keyof typeof PLANOS_CONFIG>).map((key) => {
                    const isPlanoAtivo = planoAtual?.toUpperCase() === key.toUpperCase();
                    return (
                      <button
                        key={key}
                        onClick={() => setPlanoSel(key)}
                        className={`p-3 rounded-2xl border-2 transition-all text-center relative ${
                          planoSel === key 
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-500/10 text-blue-600' 
                          : 'border-slate-100 dark:border-zinc-800 text-slate-500 hover:border-slate-200'
                        }`}
                      >
                        {isPlanoAtivo && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm whitespace-nowrap">
                            Atual
                          </span>
                        )}
                        <span className="block font-bold text-sm">{PLANOS_CONFIG[key].nome}</span>
                        <span className="text-[10px] opacity-70">R$ {PLANOS_CONFIG[key].valorBase}/mês</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="p-6 bg-slate-50 dark:bg-zinc-900/50 rounded-[32px] border border-slate-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-600">
                      <UserPlus size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">Time de Corretores</h4>
                      <p className="text-[11px] text-slate-500">+ R$ {calculo.config.valorAdd.toFixed(2)} /mês cada</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-white dark:bg-zinc-800 p-2 rounded-2xl border border-slate-200 dark:border-zinc-700">
                    <button onClick={() => setUsuariosAdd(Math.max(0, usuariosAdd - 1))} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"><Minus size={18} /></button>
                    <span className="font-black text-lg min-w-[20px] text-center">{usuariosAdd}</span>
                    <button onClick={() => setUsuariosAdd(usuariosAdd + 1)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-blue-600"><Plus size={18} /></button>
                  </div>
                </div>
              </section>

              <section 
                onClick={() => setQuerSite(!querSite)}
                className={`p-5 rounded-[32px] border-2 cursor-pointer transition-all ${querSite ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/5' : 'border-slate-100 dark:border-zinc-800 hover:border-slate-200'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${querSite ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400'}`}>
                    <Globe size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Site Corretor Premium</h4>
                      {querSite && <Check className="text-emerald-500" size={18} />}
                    </div>
                    <p className="text-[11px] text-slate-500">Hospedagem e domínio inclusos.</p>
                    <p className="text-xs font-black mt-1 text-slate-900 dark:text-white">R$ {calculo.config.siteMensal.toFixed(2)}/mês</p>
                  </div>
                </div>
              </section>

              <section 
                onClick={() => setQuerManychat(!querManychat)}
                className={`p-5 rounded-[32px] border-2 cursor-pointer transition-all ${querManychat ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/5' : 'border-slate-100 dark:border-zinc-800 hover:border-slate-200'}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${querManychat ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400'}`}>
                    <BotMessageSquare size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Gestão Manychat PRO</h4>
                      {querManychat && <Check className="text-blue-500" size={18} />}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">Setup + Integração API Oficial Meta.</p>
                    <p className="text-xs font-black mt-1 text-slate-900 dark:text-white">R$ {calculo.config.manychatMensal.toFixed(2)}/mês</p>
                  </div>
                </div>
                {querManychat && (
                  <div className="mt-4 p-3 bg-blue-100/50 dark:bg-blue-500/10 rounded-2xl flex gap-2 items-start">
                    <Info size={14} className="text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-[9px] font-medium text-blue-700 dark:text-blue-400 uppercase leading-normal">
                      Assinatura Manychat PRO cobrada à parte pela plataforma.
                    </p>
                  </div>
                )}
              </section>
            </div>

            <div className="lg:col-span-5">
              <div className="bg-slate-900 dark:bg-zinc-900 rounded-[32px] p-8 text-white sticky top-24">
                <h4 className="font-bold text-slate-400 uppercase text-[10px] tracking-widest mb-6">Resumo do Plano</h4>
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Assinatura ({calculo.config.nome})</span>
                    <span className="font-bold">R$ {(calculo.config.valorBase * calculo.config.meses).toFixed(2)}</span>
                  </div>
                  {usuariosAdd > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">{usuariosAdd}x Corretores Add.</span>
                      <span className="font-bold">R$ {(usuariosAdd * calculo.config.valorAdd * calculo.config.meses).toFixed(2)}</span>
                    </div>
                  )}
                  {querSite && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Site Institucional</span>
                      <span className="font-bold text-emerald-400">R$ {calculo.valorSiteTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {querManychat && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Integração Manychat</span>
                      <span className="font-bold text-blue-400">R$ {calculo.valorManychatTotal.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-white/10 pt-6 mb-8">
                  <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Total a Pagar</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white">R$ {calculo.totalImediato.toFixed(2)}</span>
                  </div>
                  <p className="text-[11px] text-blue-400 mt-2 font-medium italic">
                    * Equivalente a R$ {calculo.valorAssinaturaMes.toFixed(2)}/mês
                  </p>
                </div>

                <button 
                  type="button"
                  onClick={() => setShowConfirm(true)} // Abre o modal de segurança
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-900/20 group"
                >
                  <ShoppingCart size={20} className="group-hover:scale-110 transition-transform" />
                  Finalizar Pedido
                </button>

                <p className="text-[9px] text-zinc-500 text-center mt-6 uppercase tracking-widest font-bold flex items-center justify-center gap-2">
                  Segurança garantida via WhatsApp
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE SEGURANÇA E EXPLICAÇÃO */}
      {showConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in zoom-in duration-200">
          <div className="bg-white dark:bg-zinc-950 w-full max-w-md rounded-[32px] p-8 shadow-2xl border border-slate-200 dark:border-zinc-800 text-center">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
              <ShieldCheck size={40} />
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4">Quase lá!</h3>
            
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-8">
              Você será redirecionado para o nosso <strong>WhatsApp Oficial</strong>, onde um consultor humano finalizará seu atendimento, esclarecerá dúvidas e enviará o link de pagamento seguro.
            </p>

            <div className="space-y-3">
              <button
                onClick={handleFinalizarPedido}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <MessageCircle size={20} />
                    IR PARA O WHATSAPP
                  </>
                )}
              </button>
              
              <button
                onClick={() => setShowConfirm(false)}
                className="w-full bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 py-2 text-xs font-bold uppercase tracking-widest transition-colors"
              >
                Voltar e revisar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}