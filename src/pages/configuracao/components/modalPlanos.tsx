import {
  Check,
  Database,
  Globe,
  Loader2,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "../../../auth/AuthContext";
import { supabase } from "../../../lib/supabaseClient";

interface ModalPlanosProps {
  isOpen: boolean;
  onClose: () => void;
  planoAtual?: string;
}

interface Plano {
  id: string;
  codigo: string;
  nome: string;
  duracao_meses: number;
  valor_base_mensal: number;
  usuarios_ilimitados: boolean;
  site_incluso: boolean;
  conexoes_whatsapp_inclusas: number;
  storage_incluso_bytes: number;
  storage_max_file_size_bytes: number;
  ativo: boolean;
  ordem: number;
}

interface StoragePlano {
  id: string;
  codigo: string;
  nome: string;
  adicional_bytes: number;
  valor_mensal: number;
  ativo: boolean;
  ordem: number;
}

interface WhatsappPlano {
  id: string;
  codigo: string;
  total_conexoes_min: number;
  total_conexoes_max: number | null;
  valor_unitario_adicional: number;
  ativo: boolean;
  ordem: number;
}

interface Catalogo {
  planos: Plano[];
  storage: StoragePlano[];
  whatsapp: WhatsappPlano[];
}

const LIMITE_CONEXOES_SELETOR = 50;
const WHATSAPP_COMERCIAL = "5548996461645";

const toNumber = (value: number | string | null | undefined): number => {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatStorage(bytes: number) {
  if (bytes === 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${formatNumber(mb)} MB`;
  return `${formatNumber(mb / 1024)} GB`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatWhatsappFaixa(faixa: WhatsappPlano) {
  const min = faixa.total_conexoes_min;
  const max = faixa.total_conexoes_max;
  if (max === null) return `${min} ou mais`;
  if (min === max) return `${min} conexões`;
  return `${min} a ${max} conexões`;
}

function encontrarFaixa(quantidade: number, faixas: WhatsappPlano[]) {
  return faixas.find(
    (faixa) =>
      quantidade >= faixa.total_conexoes_min &&
      (faixa.total_conexoes_max === null ||
        quantidade <= faixa.total_conexoes_max),
  );
}

async function carregarCatalogo(): Promise<Catalogo> {
  const [planosResult, storageResult, whatsappResult] = await Promise.all([
    supabase
      .from("crm_planos")
      .select("id, codigo, nome, duracao_meses, valor_base_mensal, usuarios_ilimitados, site_incluso, conexoes_whatsapp_inclusas, storage_incluso_bytes, storage_max_file_size_bytes, ativo, ordem")
      .eq("ativo", true)
      .order("ordem", { ascending: true }),
    supabase
      .from("crm_storage_planos")
      .select("id, codigo, nome, adicional_bytes, valor_mensal, ativo, ordem")
      .eq("ativo", true)
      .order("ordem", { ascending: true }),
    supabase
      .from("crm_whatsapp_planos")
      .select("id, codigo, total_conexoes_min, total_conexoes_max, valor_unitario_adicional, ativo, ordem")
      .eq("ativo", true)
      .order("ordem", { ascending: true }),
  ]);

  if (planosResult.error) throw planosResult.error;
  if (storageResult.error) throw storageResult.error;
  if (whatsappResult.error) throw whatsappResult.error;

  const planos: Plano[] = (planosResult.data ?? []).map((p) => ({
    ...p,
    valor_base_mensal: toNumber(p.valor_base_mensal),
    duracao_meses: toNumber(p.duracao_meses),
    conexoes_whatsapp_inclusas: toNumber(p.conexoes_whatsapp_inclusas),
    storage_incluso_bytes: toNumber(p.storage_incluso_bytes),
    storage_max_file_size_bytes: toNumber(p.storage_max_file_size_bytes),
  }));
  const storage: StoragePlano[] = (storageResult.data ?? []).map((s) => ({
    ...s,
    adicional_bytes: toNumber(s.adicional_bytes),
    valor_mensal: toNumber(s.valor_mensal),
  }));
  const whatsapp: WhatsappPlano[] = (whatsappResult.data ?? []).map((w) => ({
    ...w,
    total_conexoes_min: toNumber(w.total_conexoes_min),
    total_conexoes_max: w.total_conexoes_max === null ? null : toNumber(w.total_conexoes_max),
    valor_unitario_adicional: toNumber(w.valor_unitario_adicional),
  }));

  if (!planos.length) throw new Error("Nenhum plano principal ativo está disponível.");
  if (!storage.length || !storage.some((s) => s.adicional_bytes === 0)) {
    throw new Error("O catálogo de armazenamento precisa ter uma opção sem adicional ativa.");
  }
  return { planos, storage, whatsapp };
}

function calcularCotacao(
  catalogo: Catalogo,
  planoId: string,
  storageId: string,
  qtdWhatsapp: number,
) {
  const plano = catalogo.planos.find((p) => p.id === planoId);
  const storage = catalogo.storage.find((s) => s.id === storageId);
  if (!plano || !storage) return null;

  const whatsappIncluso = plano.conexoes_whatsapp_inclusas;
  const adicionais = Math.max(0, qtdWhatsapp - whatsappIncluso);
  const faixa = adicionais > 0 ? encontrarFaixa(qtdWhatsapp, catalogo.whatsapp) : undefined;
  if (adicionais > 0 && !faixa) return null;

  const valorWhatsapp = adicionais * (faixa?.valor_unitario_adicional ?? 0);
  const valorMensal = plano.valor_base_mensal + storage.valor_mensal + valorWhatsapp;
  return {
    plano,
    storage,
    qtdWhatsapp,
    adicionais,
    valorWhatsapp,
    valorMensal,
    valorTotal: Math.round(valorMensal * plano.duracao_meses * 100) / 100,
    totalStorageBytes: plano.storage_incluso_bytes + storage.adicional_bytes,
  };
}

export function ModalPlanos({ isOpen, onClose, planoAtual }: ModalPlanosProps) {
  const { userProfile } = useAuth();
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [planoId, setPlanoId] = useState("");
  const [storageId, setStorageId] = useState("");
  const [qtdWhatsapp, setQtdWhatsapp] = useState(1);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const buscar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const novo = await carregarCatalogo();
      setCatalogo(novo);
      setPlanoId((anterior) => {
        if (anterior && novo.planos.some((p) => p.id === anterior)) return anterior;
        const atual = planoAtual?.trim().toUpperCase();
        return novo.planos.find((p) => p.codigo.toUpperCase() === atual || p.nome.toUpperCase() === atual)?.id
          ?? novo.planos[0].id;
      });
      setStorageId((anterior) =>
        novo.storage.some((s) => s.id === anterior)
          ? anterior
          : (novo.storage.find((s) => s.adicional_bytes === 0)?.id ?? novo.storage[0].id),
      );
    } catch (e: unknown) {
      setCatalogo(null);
      setErro(e instanceof Error ? e.message : "Não foi possível carregar os preços do banco de dados.");
    } finally {
      setCarregando(false);
    }
  }, [planoAtual]);

  useEffect(() => {
    if (!isOpen) return;
    setShowConfirm(false);
    setCatalogo(null);
    setPlanoId("");
    setStorageId("");
    setQtdWhatsapp(1);
    void buscar();
  }, [isOpen, buscar]);

  const planoEscolhido = catalogo?.planos.find((p) => p.id === planoId);
  useEffect(() => {
    if (!planoEscolhido) return;
    setQtdWhatsapp((atual) => Math.max(atual, planoEscolhido.conexoes_whatsapp_inclusas));
  }, [planoEscolhido]);

  const calculo = useMemo(
    () => catalogo ? calcularCotacao(catalogo, planoId, storageId, qtdWhatsapp) : null,
    [catalogo, planoId, storageId, qtdWhatsapp],
  );

  const handleSolicitar = async () => {
    if (!catalogo || !calculo) return;
    if (!userProfile?.corretora_id) {
      toast.error("Perfil da corretora não identificado.");
      return;
    }
    setEnviando(true);
    try {
      // Consulta novamente o catálogo antes de enviar a cotação: não utiliza valores antigos.
      const atualizado = await carregarCatalogo();
      const novaCotacao = calcularCotacao(atualizado, planoId, storageId, qtdWhatsapp);
      if (!novaCotacao) {
        setShowConfirm(false);
        setCatalogo(atualizado);
        toast.error("Uma opção escolhida não está mais disponível. Revise sua seleção.");
        return;
      }
      if (
        novaCotacao.valorMensal !== calculo.valorMensal ||
        novaCotacao.valorTotal !== calculo.valorTotal ||
        novaCotacao.totalStorageBytes !== calculo.totalStorageBytes ||
        novaCotacao.plano.conexoes_whatsapp_inclusas !== calculo.plano.conexoes_whatsapp_inclusas
      ) {
        setCatalogo(atualizado);
        setShowConfirm(false);
        toast.info("Os valores ou benefícios foram atualizados no banco. Confira a nova cotação antes de continuar.");
        return;
      }

      const nomeCorretora = userProfile.nome_corretora || userProfile.nome || "N/A";
      const mensagem = criarMensagemWhatsApp(nomeCorretora, userProfile.corretora_id, novaCotacao);
      const url = `https://wa.me/${WHATSAPP_COMERCIAL}?text=${encodeURIComponent(mensagem)}`;
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success("Solicitação preparada para envio pelo WhatsApp.");
      setShowConfirm(false);
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar os preços.");
    } finally {
      setEnviando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-[40px] border border-slate-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/90 p-6 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-black text-slate-900 dark:text-white">
                <Zap className="text-yellow-500" fill="currentColor" size={24} /> SeguroCRM Profissional
              </h2>
              <p className="mt-1 text-sm text-slate-500">Escolha seu plano e personalize armazenamento e conexões WhatsApp.</p>
            </div>
            <button type="button" aria-label="Fechar" onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800">
              <X size={24} className="text-slate-400" />
            </button>
          </div>

          {carregando && (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin" /> Carregando preços atualizados...
            </div>
          )}
          {!carregando && erro && (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 px-8 text-center">
              <p className="max-w-lg text-sm text-red-600">{erro}</p>
              <button type="button" onClick={() => void buscar()} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">Tentar novamente</button>
            </div>
          )}

          {!carregando && !erro && catalogo && calculo && (
            <div className="grid grid-cols-1 gap-8 p-8 lg:grid-cols-12">
              <div className="space-y-8 lg:col-span-7">
                <section>
                  <label className="mb-4 ml-1 block text-xs font-black uppercase tracking-widest text-slate-400">1. Escolha o ciclo</label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {catalogo.planos.map((plano) => {
                      const selected = planoId === plano.id;
                      const atual = planoAtual?.trim().toUpperCase();
                      const eAtual = plano.codigo.toUpperCase() === atual || plano.nome.toUpperCase() === atual;
                      return (
                        <button key={plano.id} type="button" onClick={() => setPlanoId(plano.id)}
                          className={`relative rounded-2xl border-2 p-4 text-center transition-all ${selected ? "border-blue-600 bg-blue-50 text-blue-600 shadow-md dark:bg-blue-500/10" : "border-slate-100 text-slate-500 hover:border-slate-200 dark:border-zinc-800"}`}>
                          {eAtual && <span className="absolute right-2 top-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] font-black uppercase text-emerald-600">Atual</span>}
                          <span className="block text-sm font-bold">{plano.nome}</span>
                          <span className="mt-1 block text-[10px] font-black">{formatMoney(plano.valor_base_mensal)}/mês</span>
                          <span className="mt-1 block text-[9px] text-slate-400">{formatMoney(plano.valor_base_mensal * plano.duracao_meses)} no ciclo</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="rounded-[32px] border border-slate-100 bg-slate-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20"><Database size={20} /></div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Espaço de Armazenamento</h4>
                      <p className="text-[10px] font-bold uppercase tracking-tight text-slate-500">{formatStorage(calculo.plano.storage_incluso_bytes)} inclusos no plano</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {catalogo.storage.map((opcao) => (
                      <button key={opcao.id} type="button" onClick={() => setStorageId(opcao.id)}
                        className={`rounded-xl border-2 p-3 text-[11px] font-bold transition-all ${storageId === opcao.id ? "border-indigo-500 bg-white text-indigo-600 shadow-sm dark:bg-zinc-800" : "border-transparent text-slate-400 hover:bg-white/50 dark:hover:bg-zinc-800/50"}`}>
                        {opcao.adicional_bytes === 0 ? `${formatStorage(calculo.plano.storage_incluso_bytes)} inclusos` : opcao.nome}
                        <span className="mt-1 block text-[9px] opacity-70">{opcao.valor_mensal === 0 ? "Sem adicional" : `+ ${formatMoney(opcao.valor_mensal)}/mês`}</span>
                        {opcao.adicional_bytes >= 1024 ** 3 && (
                          <span className="mt-0.5 block text-[8px] font-medium opacity-50">
                            {formatMoney(opcao.valor_mensal / (opcao.adicional_bytes / (1024 ** 3)))} por GB
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 rounded-xl bg-indigo-50 px-4 py-3 text-xs text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                    Capacidade total contratada: <strong>{formatStorage(calculo.totalStorageBytes)}</strong>
                  </div>
                </section>

                <section className="rounded-[32px] border border-slate-100 bg-slate-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20"><Smartphone size={20} /></div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Conexões WhatsApp</h4>
                      <p className="text-[10px] font-bold uppercase tracking-tight text-slate-500">{calculo.plano.conexoes_whatsapp_inclusas} conexão(ões) inclusa(s) no plano</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Total de conexões</p>
                      <p className="mt-1 text-[10px] text-slate-400">Você pode aumentar ou reduzir conforme sua operação.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" aria-label="Diminuir conexões" disabled={qtdWhatsapp <= calculo.plano.conexoes_whatsapp_inclusas}
                        onClick={() => setQtdWhatsapp((v) => Math.max(calculo.plano.conexoes_whatsapp_inclusas, v - 1))}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 disabled:cursor-not-allowed disabled:opacity-30 dark:border-zinc-700"><Minus size={17} /></button>
                      <span className="min-w-[36px] text-center text-xl font-black text-slate-900 dark:text-white">{qtdWhatsapp}</span>
                      <button type="button" aria-label="Aumentar conexões" disabled={qtdWhatsapp >= LIMITE_CONEXOES_SELETOR}
                        onClick={() => setQtdWhatsapp((v) => Math.min(LIMITE_CONEXOES_SELETOR, v + 1))}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-blue-600 disabled:opacity-30 dark:border-zinc-700"><Plus size={17} /></button>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <PriceInfo label={`${calculo.plano.conexoes_whatsapp_inclusas} inclusa(s)`} value="Sem adicional" />
                    {catalogo.whatsapp.map((faixa) => (
                      <PriceInfo key={faixa.id} label={formatWhatsappFaixa(faixa)} value={`${formatMoney(faixa.valor_unitario_adicional)}/un. adicional`} />
                    ))}
                  </div>
                  {calculo.adicionais > 0 && <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Adicional mensal de WhatsApp: <strong>{formatMoney(calculo.valorWhatsapp)}</strong></div>}
                </section>

                <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {calculo.plano.usuarios_ilimitados && <BenefitCard icon={<Users size={18} />} title="Usuários ilimitados" />}
                  {calculo.plano.site_incluso && <BenefitCard icon={<Globe size={18} />} title="Site corporativo incluso" />}
                  <BenefitCard icon={<Check size={18} />} title={`${formatStorage(calculo.plano.storage_incluso_bytes)} + ${calculo.plano.conexoes_whatsapp_inclusas} WhatsApp`} />
                </section>
              </div>

              <div className="lg:col-span-5">
                <div className="sticky top-24 rounded-[32px] border border-white/5 bg-slate-900 p-8 text-white shadow-2xl dark:bg-zinc-900">
                  <h4 className="mb-6 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Resumo da Assinatura</h4>
                  <div className="mb-8 space-y-4">
                    <ResumoLinha label={`Plano ${calculo.plano.nome}`} value={formatMoney(calculo.plano.valor_base_mensal)} />
                    <ResumoLinha label={`Storage ${formatStorage(calculo.totalStorageBytes)}`} value={calculo.storage.valor_mensal > 0 ? `+ ${formatMoney(calculo.storage.valor_mensal)}` : "Incluso"} destaque="indigo" />
                    <ResumoLinha label={`${qtdWhatsapp} conexão(ões) WhatsApp`} value={calculo.valorWhatsapp > 0 ? `+ ${formatMoney(calculo.valorWhatsapp)}` : "Incluso"} destaque="emerald" />
                    <ResumoLinha label="Usuários" value={calculo.plano.usuarios_ilimitados ? "Ilimitados" : "Conforme plano"} destaque="emerald" />
                    <ResumoLinha label="Site corporativo" value={calculo.plano.site_incluso ? "Incluso" : "Não incluso"} destaque="emerald" />
                  </div>
                  <div className="border-t border-white/10 pt-6">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Mensalidade equivalente</p>
                    <div className="flex items-baseline gap-2"><span className="text-4xl font-black text-white">{formatMoney(calculo.valorMensal)}</span><span className="text-xs text-slate-400">/mês</span></div>
                    <p className="mb-1 mt-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Total do ciclo</p>
                    <p className="text-2xl font-black text-blue-400">{formatMoney(calculo.valorTotal)}</p>
                    <p className="mt-2 text-[11px] font-medium italic text-slate-400">Ciclo de {calculo.plano.duracao_meses} mês(es).</p>
                  </div>
                  <button type="button" onClick={() => setShowConfirm(true)} className="group mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-xl shadow-blue-900/40 transition-all hover:bg-blue-500">
                    <ShoppingCart size={20} /> Solicitar Contratação
                  </button>
                  <p className="mt-3 text-center text-[10px] text-slate-400">A solicitação é enviada pelo WhatsApp e depende de confirmação comercial.</p>
                </div>
              </div>
            </div>
          )}
          {!carregando && !erro && catalogo && !calculo && (
            <div className="p-8 text-center text-sm text-red-600">A combinação selecionada não possui tarifa WhatsApp ativa. Verifique o catálogo de preços.</div>
          )}
        </div>
      </div>

      {showConfirm && calculo && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/90 p-4 backdrop-blur-md animate-in zoom-in duration-200">
          <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20"><ShieldCheck size={40} /></div>
            <h3 className="mb-2 text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Tudo pronto!</h3>
            <p className="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400">Confira sua cotação. Ao continuar, você será direcionado ao WhatsApp para solicitar a contratação. Nenhuma assinatura será ativada automaticamente.</p>
            <div className="mb-6 rounded-2xl bg-slate-50 p-4 text-left dark:bg-zinc-900">
              <ResumoConfirmacao label="Plano" value={calculo.plano.nome} />
              <ResumoConfirmacao label="Armazenamento" value={formatStorage(calculo.totalStorageBytes)} />
              <ResumoConfirmacao label="WhatsApp" value={`${calculo.qtdWhatsapp} conexão(ões)`} />
              <ResumoConfirmacao label="Mensal equivalente" value={formatMoney(calculo.valorMensal)} />
              <ResumoConfirmacao label="Total do ciclo" value={formatMoney(calculo.valorTotal)} strong />
            </div>
            <div className="space-y-3">
              <button type="button" onClick={() => void handleSolicitar()} disabled={enviando} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 font-black text-white transition-all hover:bg-emerald-500 disabled:opacity-50">
                {enviando ? <Loader2 className="animate-spin" /> : <><MessageCircle size={20} /> SOLICITAR NO WHATSAPP</>}
              </button>
              <button type="button" disabled={enviando} onClick={() => setShowConfirm(false)} className="w-full py-2 text-xs font-bold uppercase text-slate-400 hover:text-slate-600">Revisar Pedido</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

type Cotacao = NonNullable<ReturnType<typeof calcularCotacao>>;
function criarMensagemWhatsApp(nomeCorretora: string, corretoraId: string, cotacao: Cotacao) {
  return `*SOLICITAÇÃO DE CONTRATAÇÃO SEGUROCRM* 🚀
---------------------------------------
*Corretora:* ${nomeCorretora}
*ID:* ${corretoraId}

*PLANO*
- Ciclo: *${cotacao.plano.nome.toUpperCase()}*
- Duração: ${cotacao.plano.duracao_meses} mês(es)
- Plano base: ${formatMoney(cotacao.plano.valor_base_mensal)}/mês
- Usuários ilimitados: ${cotacao.plano.usuarios_ilimitados ? "SIM" : "NÃO"}
- Site corporativo: ${cotacao.plano.site_incluso ? "INCLUSO" : "NÃO INCLUSO"}
- Conexões inclusas: ${cotacao.plano.conexoes_whatsapp_inclusas}
- Armazenamento incluso: ${formatStorage(cotacao.plano.storage_incluso_bytes)}

*WHATSAPP*
- Total de conexões: ${cotacao.qtdWhatsapp}
- Adicionais: ${cotacao.adicionais}
- Adicional mensal: ${formatMoney(cotacao.valorWhatsapp)}

*ARMAZENAMENTO*
- Pacote: ${cotacao.storage.nome}
- Capacidade total: ${formatStorage(cotacao.totalStorageBytes)}
- Adicional mensal: ${formatMoney(cotacao.storage.valor_mensal)}

*RESUMO*
- Mensalidade equivalente: *${formatMoney(cotacao.valorMensal)}*
- Total do ciclo: *${formatMoney(cotacao.valorTotal)}*

---------------------------------------
Olá! Gostaria de solicitar a contratação do meu SeguroCRM conforme esta cotação. Entendo que a ativação depende de confirmação comercial.`;
}

function BenefitCard({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5"><span className="text-emerald-500">{icon}</span><span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{title}</span></div>;
}

function PriceInfo({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white p-3 dark:bg-zinc-900"><p className="text-[9px] font-black uppercase text-slate-400">{label}</p><p className="mt-1 text-[10px] font-bold text-slate-700 dark:text-slate-200">{value}</p></div>;
}

function ResumoLinha({ label, value, destaque }: { label: string; value: string; destaque?: "indigo" | "emerald" }) {
  const classe = destaque === "emerald" ? "text-emerald-400" : destaque === "indigo" ? "text-indigo-400" : "text-white";
  return <div className="flex items-center justify-between gap-4 text-sm"><span className="text-slate-400">{label}</span><span className={`shrink-0 font-bold ${classe}`}>{value}</span></div>;
}

function ResumoConfirmacao({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className="flex items-center justify-between gap-4 py-1.5 text-xs"><span className="text-slate-500">{label}</span><span className={strong ? "font-black text-blue-600" : "font-bold text-slate-800 dark:text-slate-200"}>{value}</span></div>;
}
