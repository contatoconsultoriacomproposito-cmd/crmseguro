import { useState, useMemo } from 'react';
import { X, UserPlus, Minus, Plus, Globe, Check, Zap, ShoppingCart } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { toast } from 'sonner';
import { useAuth } from '../../../auth/AuthContext';

interface ModalPlanosProps {
  isOpen: boolean;
  onClose: () => void;
  planoAtual?: string;
}

// 1. Configuração de Preços
const PLANOS_CONFIG = {
  mensal: {
    nome: "Mensal",
    meses: 1,
    valorBase: 119.97,
    valorAdd: 69.97,
    siteMensal: 300.00,
    siteRenovacao: 350.00
  },
  trimestral: {
    nome: "Trimestral",
    meses: 3,
    valorBase: 109.97,
    valorAdd: 59.97,
    siteMensal: 250.00,
    siteRenovacao: 300.00
  },
  semestral: {
    nome: "Semestral",
    meses: 6,
    valorBase: 99.97,
    valorAdd: 49.97,
    siteMensal: 200.00,
    siteRenovacao: 250.00
  },
  anual: {
    nome: "Anual",
    meses: 12,
    valorBase: 79.97,
    valorAdd: 39.97,
    siteMensal: 150.00,
    siteRenovacao: 200.00
  }
};

export function ModalPlanos({ isOpen, onClose, planoAtual }: ModalPlanosProps) {
  // Estados
  const { userProfile } = useAuth();
  const [planoSel, setPlanoSel] = useState<keyof typeof PLANOS_CONFIG>("mensal");
  const [usuariosAdd, setUsuariosAdd] = useState(0);
  const [querSite, setQuerSite] = useState(false);
  const [loading, setLoading] = useState(false);

  // Lógica de Cálculo
  const calculo = useMemo(() => {
    const config = PLANOS_CONFIG[planoSel];
    const valorSiteNoMes = querSite ? config.siteMensal : 0;
    const valorAssinaturaMes = config.valorBase + (usuariosAdd * config.valorAdd) + valorSiteNoMes;
    const totalImediato = valorAssinaturaMes * config.meses;

    return {
      valorAssinaturaMes,
      totalImediato,
      valorSiteTotal: valorSiteNoMes * config.meses,
      config
    };
  }, [planoSel, usuariosAdd, querSite]);

  // Função de Checkout (Agora dentro do componente para acessar o estado)
 const handleCheckout = async () => {
    setLoading(true);
    try {
      // VALIDADO: Usamos o userProfile para garantir o vínculo correto
      if (!userProfile?.corretora_id) {
        toast.error("Erro: Perfil da corretora não identificado.");
        return;
      }

      const { data: planoDb, error: dbError } = await supabase
        .from('tab_planos')
        .insert([{
          corretora_id: userProfile.corretora_id, // CORRIGIDO: de user.id para userProfile.corretora_id
          plano_nome: calculo.config.nome.toUpperCase(),
          periodicidade: planoSel,
          valor_total: calculo.totalImediato,
          qtd_usuarios_adicionais: usuariosAdd,
          possui_site: querSite,
          data_fim: new Date(new Date().setMonth(new Date().getMonth() + calculo.config.meses)).toISOString(),
          status_assinatura: 'PENDENTE'
        }])
        .select()
        .single();

      if (dbError) throw dbError;

    console.log("✅ Registro salvo no banco:", planoDb);
    alert("Plano registrado! O status aparecerá como Pendente até a confirmação do pagamento.");
    onClose(); // Fecha o modal após o sucesso

    // 2. Mock da API (Enquanto não criamos a rota real)
    // Comente as linhas abaixo se quiser parar de ver o erro 404 no console
    try {
      const response = await fetch('/api/checkout/mercado-pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ external_reference: planoDb.id }),
      });
      
      if (response.ok) {
        const { init_point } = await response.json();
        if (init_point) window.location.href = init_point;
      } else {
        // Apenas um log amigável já que sabemos que a API não existe
        console.warn("⚠️ API de Checkout ainda não configurada. O registro foi salvo, mas o redirecionamento foi pulado.");
        alert("Plano registrado! (Aguardando integração com Mercado Pago)");
      }
    } catch (apiErr) {
      console.warn("Aguardando implementação da API...");
    }

  } catch (error: any) {
    console.error('Erro no checkout:', error.message);
    alert("Erro ao salvar intenção de compra.");
  } finally {
    setLoading(false);
  }
};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-zinc-950 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[40px] shadow-2xl border border-slate-200 dark:border-zinc-800">
        
        {/* Header */}
        <div className="sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md p-6 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center z-10">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="text-yellow-500" fill="currentColor" size={24} /> 
              Escolha seu Plano
            </h2>
            <p className="text-slate-500 text-sm">Aumente sua produtividade com recursos exclusivos.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-8">
            {/* 1. Periodicidade */}
            <section>
              <label className="text-xs font-black uppercase text-slate-400 mb-4 block ml-1">1. Periodicidade</label>
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
                          Plano Atual
                        </span>
                      )}
                      <span className="block font-bold text-sm">{PLANOS_CONFIG[key].nome}</span>
                      <span className="text-[10px] opacity-70">R$ {PLANOS_CONFIG[key].valorBase}/mês</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 2. Usuários Adicionais */}
            <section className="p-6 bg-slate-50 dark:bg-zinc-900/50 rounded-[32px] border border-slate-100 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-600">
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">Usuários Adicionais</h4>
                    <p className="text-xs text-slate-500">Corretores vinculados</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-white dark:bg-zinc-800 p-2 rounded-2xl border border-slate-200 dark:border-zinc-700">
                  <button 
                    type="button"
                    onClick={() => setUsuariosAdd(Math.max(0, usuariosAdd - 1))}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-lg transition-colors text-slate-500"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="font-black text-lg min-w-[20px] text-center">{usuariosAdd}</span>
                  <button 
                    type="button"
                    onClick={() => setUsuariosAdd(usuariosAdd + 1)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-lg transition-colors text-blue-600"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 italic text-center">
                + R$ {calculo.config.valorAdd.toFixed(2)} /mês por usuário neste plano
              </p>
            </section>

            {/* 3. Site Institucional */}
            <section 
              onClick={() => setQuerSite(!querSite)}
              className={`p-6 rounded-[32px] border-2 cursor-pointer transition-all ${
                querSite 
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/5' 
                : 'border-slate-100 dark:border-zinc-800 hover:border-slate-200'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                  querSite ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400'
                }`}>
                  <Globe size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-900 dark:text-white">Site Institucional Onepage</h4>
                    {querSite && <Check className="text-emerald-500" size={20} />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Criação, domínio e hospedagem integrados.</p>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-lg font-black text-slate-900 dark:text-white">
                      R$ {calculo.config.siteMensal.toFixed(2)}/mês
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">
                      No plano {calculo.config.nome}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Resumo Financeiro */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900 dark:bg-zinc-900 rounded-[32px] p-8 text-white sticky top-24">
              <h4 className="font-bold text-slate-400 uppercase text-[10px] tracking-widest mb-6">Resumo do Pedido</h4>
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Plano {calculo.config.nome}</span>
                  <span className="font-bold">R$ {(calculo.config.valorBase * calculo.config.meses).toFixed(2)}</span>
                </div>
                {usuariosAdd > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">{usuariosAdd}x Usuários Add.</span>
                    <span className="font-bold">R$ {(usuariosAdd * calculo.config.valorAdd * calculo.config.meses).toFixed(2)}</span>
                  </div>
                )}
                {querSite && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Site Institucional</span>
                    <span className="font-bold text-emerald-400">R$ {calculo.valorSiteTotal.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 pt-6 mb-8">
                <p className="text-[10px] text-slate-400 uppercase font-black mb-1">Total a pagar agora</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">R$ {calculo.totalImediato.toFixed(2)}</span>
                  <span className="text-xs text-slate-400">/ {calculo.config.nome}</span>
                </div>
                <p className="text-[11px] text-blue-400 mt-2 font-medium italic">
                  * Equivalente a R$ {calculo.valorAssinaturaMes.toFixed(2)}/mês total
                </p>
              </div>

              <button 
                type="button"
                onClick={handleCheckout}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-900/20 group"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <ShoppingCart size={20} className="group-hover:scale-110 transition-transform" />
                    Contratar Agora
                  </>
                )}
              </button>

              <p className="text-[10px] text-slate-500 text-center mt-6">
                Pagamento processado via Mercado Pago.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}