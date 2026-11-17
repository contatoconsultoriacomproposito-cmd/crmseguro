import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle, ArrowLeft, CheckCircle2, ChevronRight, Clock3, Info, Loader2,
  LockKeyhole, Save, ShieldCheck, Sparkles, UserRoundCog, X,
} from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import type { ModalPermissoesUsuarioProps } from "./components/permissoesTypes";
import { GRUPOS_PERMISSOES, type GrupoPermissao, type ModuloPermissaoId } from "./components/estruturaPermissoes";
import {
  compararPermissoes, contarConcedidas, criarPayloadParcial, normalizarAtivas,
  permissoesCriticas, type EscopoAtivo, type PermissoesAtivas,
} from "./components/permissoesEstado";
import { CARGOS_PRESET, construirPreset, type CargoPreset } from "./components/presetsPermissoes";
import ModalPermissoesContatos from "./components/ModalPermissoesContatos";
import ModalPermissoesConversas from "./components/ModalPermissoesConversas";
import ModalPermissoesAgenda from "./components/ModalPermissoesAgenda";
import ModalPermissoesEquipe from "./components/ModalPermissoesEquipe";
import ModalPermissoesClientes from "./components/ModalPermissoesClientes";
import ModalPermissoesPropostas from "./components/ModalPermissoesPropostas";
import ModalPermissoesRenovacoes from "./components/ModalPermissoesRenovacoes";
import ModalPermissoesComissoes from "./components/ModalPermissoesComissoes";
import ModalPermissoesSinistro from "./components/ModalPermissoesSinistro";
import ModalPermissoesAssistencia from "./components/ModalPermissoesAssistencia";
import ModalPermissoesTarefas from "./components/ModalPermissoesTarefas";
import ModalPermissoesContasPagar from "./components/ModalPermissoesContasPagar";
import ModalPermissoesContasReceber from "./components/ModalPermissoesContasReceber";
import ModalPermissoesFluxoCaixa from "./components/ModalPermissoesFluxoCaixa";
import ModalPermissoesParcelasClientes from "./components/ModalPermissoesParcelasClientes";
import ModalPermissoesConexoesWhatsapp from "./components/ModalPermissoesConexoesWhatsapp";
import ModalPermissoesArmazenamento from "./components/ModalPermissoesArmazenamento";
import ModalPermissoesSeguradoras from "./components/ModalPermissoesSeguradoras";
import ModalPermissoesConfiguracoes from "./components/ModalPermissoesConfiguracoes";

async function chamarEquipe(body: Record<string, unknown>): Promise<{ success: boolean; permissoes?: unknown; error?: string }> {
  const { data, error } = await supabase.functions.invoke("cadastrar-usuario", { body });
  if (error) {
    let mensagem = error.message;
    try {
      const context = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
      if (typeof context?.json === "function") {
        const resposta = await context.json();
        if (typeof resposta?.error === "string") mensagem = resposta.error;
      }
    } catch { /* Mantém a mensagem original. */ }
    throw new Error(mensagem);
  }
  if (data?.error) throw new Error(data.error);
  if (!data?.success) throw new Error("A operação não retornou confirmação de sucesso.");
  return data;
}

const BOTAO_SECUNDARIO = "inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";
const BOTAO_PRIMARIO = "inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40";

export default function ModalPermissoesUsuario({
  open, usuarioId, corretoraId, nomeUsuario, emailUsuario, funcaoUsuario, onClose, onSaved,
}: ModalPermissoesUsuarioProps) {
  const [dados, setDados] = useState<PermissoesAtivas | null>(null);
  const [originais, setOriginais] = useState<PermissoesAtivas | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [grupoSelecionado, setGrupoSelecionado] = useState<GrupoPermissao | null>(null);
  const [moduloSelecionado, setModuloSelecionado] = useState<ModuloPermissaoId | null>(null);
  const [mostrarPresets, setMostrarPresets] = useState(false);
  const [cargoPreset, setCargoPreset] = useState<CargoPreset>("CORRETOR");
  const [previsualizandoPreset, setPrevisualizandoPreset] = useState(false);
  const [confirmarSaida, setConfirmarSaida] = useState(false);

  useEffect(() => {
    if (!open || !usuarioId || !corretoraId) return;
    let cancelado = false;
    setDados(null);
    setOriginais(null);
    setLoading(true);
    setErro("");
    setSucesso("");
    setGrupoSelecionado(null);
    setModuloSelecionado(null);
    setMostrarPresets(false);
    setConfirmarSaida(false);
    setPrevisualizandoPreset(false);
    setCargoPreset(CARGOS_PRESET.some(c => c.value === funcaoUsuario) ? funcaoUsuario as CargoPreset : "CORRETOR");

    void (async () => {
      try {
        const resposta = await chamarEquipe({ action: "CONSULTAR_PERMISSOES", membro_id: usuarioId });
        if (cancelado) return;
        const atual = normalizarAtivas(resposta.permissoes ?? {});
        setDados(atual);
        setOriginais(atual);
      } catch (error) {
        if (!cancelado) setErro(error instanceof Error ? error.message : "Não foi possível carregar as permissões.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => { cancelado = true; };
  }, [open, usuarioId, corretoraId, funcaoUsuario]);

  const diferencas = useMemo(() => dados && originais ? compararPermissoes(originais, dados) : [], [dados, originais]);
  const quantidadeCritica = useMemo(() => permissoesCriticas(diferencas), [diferencas]);
  const grupoAtual = GRUPOS_PERMISSOES.find(item => item.id === grupoSelecionado) ?? null;
  const moduloAtual = grupoAtual?.modulos.find(item => item.id === moduloSelecionado) ?? null;
  const presetCalculado = useMemo(() => construirPreset(cargoPreset), [cargoPreset]);
  const previaPreset = useMemo(() => dados ? compararPermissoes(dados, presetCalculado) : [], [dados, presetCalculado]);

  function alterar(modulo: keyof PermissoesAtivas, acao: string, escopo: EscopoAtivo) {
    setDados(antes => {
      if (!antes) return antes;
      const atual = antes[modulo] as unknown as Record<string, EscopoAtivo>;
      if (!(acao in atual) || atual[acao] === escopo) return antes;
      return { ...antes, [modulo]: { ...atual, [acao]: escopo } };
    });
    setSucesso("");
  }

  function aplicarTodas(modulo: keyof PermissoesAtivas, escopo: EscopoAtivo, acoes?: string[]) {
    setDados(antes => {
      if (!antes) return antes;
      const atual = antes[modulo] as unknown as Record<string, EscopoAtivo>;
      const editadas: Record<string, EscopoAtivo> = { ...atual };
      for (const acao of Object.keys(atual)) {
        if (!acoes || acoes.includes(acao)) editadas[acao] = escopo;
      }
      return { ...antes, [modulo]: editadas };
    });
    setSucesso("");
  }

  function escolherGrupo(grupo: GrupoPermissao) {
    const selecionado = GRUPOS_PERMISSOES.find(g => g.id === grupo);
    setGrupoSelecionado(grupo);
    setModuloSelecionado(selecionado?.modulos[0]?.id ?? null);
    setErro("");
    setMostrarPresets(false);
  }

  function aplicarPresetAoRascunho() {
    if (!dados || !previsualizandoPreset || saving) return;
    setDados(construirPreset(cargoPreset));
    setPrevisualizandoPreset(false);
    setMostrarPresets(false);
    setSucesso(`Preset ${CARGOS_PRESET.find(item => item.value === cargoPreset)?.label} aplicado ao rascunho. Revise os módulos e clique em Salvar para gravar.`);
    setErro("");
  }

  async function salvarPermissoes() {
    if (!usuarioId || !corretoraId || saving || loading || !dados || !originais || diferencas.length === 0) return;
    const alteracoesPendentes = diferencas;
    const esperado = dados;
    try {
      setSaving(true);
      setErro("");
      setSucesso("");
      const resposta = await chamarEquipe({
        action: "ALTERAR_PERMISSOES", membro_id: usuarioId,
        permissoes: criarPayloadParcial(alteracoesPendentes),
      });
      if (!resposta.permissoes || typeof resposta.permissoes !== "object") {
        throw new Error("A função não devolveu o JSON de permissões salvo. Reabra o modal antes de tentar novamente.");
      }
      const confirmado = normalizarAtivas(resposta.permissoes);
      const naoConfirmadas = alteracoesPendentes.filter(({ modulo, acao, proximo }) =>
        (confirmado[modulo] as unknown as Record<string, string>)[acao] !== proximo,
      );
      if (naoConfirmadas.length) {
        throw new Error("O servidor não confirmou todas as alterações. Confira a Edge Function e recarregue o modal.");
      }
      // A confirmação é o estado devolvido pelo servidor, nunca um sucesso otimista.
      setDados(confirmado);
      setOriginais(confirmado);
      setSucesso(`${alteracoesPendentes.length} alteração(ões) salva(s) e confirmada(s) no servidor.`);
      onSaved?.();
    } catch (error) {
      // O rascunho permanece intacto em caso de falha.
      setDados(esperado);
      setErro(error instanceof Error ? error.message : "Não foi possível salvar as permissões.");
    } finally {
      setSaving(false);
    }
  }

  function solicitarFechamento() {
    if (saving) return;
    if (diferencas.length > 0) setConfirmarSaida(true);
    else onClose();
  }

  function renderizarModulo() {
    if (!dados || !moduloAtual) return null;
    const disabled = saving || loading;
    switch (moduloAtual.id) {
      case "contatos": return <ModalPermissoesContatos value={dados.contatos} disabled={disabled} onChange={(a, v) => alterar("contatos", a, v)} onAplicarTodas={v => aplicarTodas("contatos", v)} />;
      case "conversas": return <ModalPermissoesConversas value={dados.conversas} disabled={disabled} onChange={(a, v) => alterar("conversas", a, v)} onAplicarTodas={v => aplicarTodas("conversas", v)} />;
      case "agenda": return <ModalPermissoesAgenda value={dados.agenda} disabled={disabled} onChange={(a, v) => alterar("agenda", a, v)} onAplicarOperacional={v => aplicarTodas("agenda", v, ["read", "manage"])} onRemover={() => aplicarTodas("agenda", "none")} />;
      case "equipe": return <ModalPermissoesEquipe value={dados.equipe} disabled={disabled} onChange={(a, v) => alterar("equipe", a, v)} onAplicarTodas={v => aplicarTodas("equipe", v)} />;
      case "clientes": return <ModalPermissoesClientes value={dados.clientes} disabled={disabled} onChange={(a, v) => alterar("clientes", a, v)} onAplicarTodas={v => aplicarTodas("clientes", v)} />;
      case "propostas": return <ModalPermissoesPropostas value={dados.propostas} disabled={disabled} onChange={(a, v) => alterar("propostas", a, v)} onAplicarTodas={v => aplicarTodas("propostas", v, Object.keys(dados.propostas).filter(a => a !== "delete_cascade"))} />;
      case "renovacoes": return <ModalPermissoesRenovacoes value={dados.renovacoes} disabled={disabled} onChange={(a, v) => alterar("renovacoes", a, v)} onAplicarTodas={v => aplicarTodas("renovacoes", v)} />;
      case "comissoes": return <ModalPermissoesComissoes value={dados.comissoes} disabled={disabled} onChange={(a, v) => alterar("comissoes", a, v)} onAplicarTodas={v => aplicarTodas("comissoes", v)} />;
      case "sinistros": return <ModalPermissoesSinistro value={dados.sinistros} disabled={disabled} onChange={(a, v) => alterar("sinistros", a, v)} onAplicarTodas={v => aplicarTodas("sinistros", v)} />;
      case "assistencias": return <ModalPermissoesAssistencia value={dados.assistencias} disabled={disabled} onChange={(a, v) => alterar("assistencias", a, v)} onAplicarTodas={v => aplicarTodas("assistencias", v)} />;
      case "tarefas":
        return (
          <ModalPermissoesTarefas
            value={dados.tarefas}
            disabled={disabled}
            onChange={(acao, escopo) =>
              alterar("tarefas", acao, escopo)
            }
            onAplicarTodas={(escopo) =>
              aplicarTodas("tarefas", escopo)
            }
          />
        );
      case "contas_pagar": return <ModalPermissoesContasPagar value={dados.contas_pagar} disabled={disabled} onChange={(a, v) => alterar("contas_pagar", a, v)} onAplicarTodas={v => aplicarTodas("contas_pagar", v)} />;
      case "contas_receber": return <ModalPermissoesContasReceber value={dados.contas_receber} disabled={disabled} onChange={(a, v) => alterar("contas_receber", a, v)} onAplicarTodas={v => aplicarTodas("contas_receber", v)} />;
      case "fluxo_caixa": return <ModalPermissoesFluxoCaixa value={dados.fluxo_caixa} disabled={disabled} onChange={(a, v) => alterar("fluxo_caixa", a, v)} onAplicarTodas={v => aplicarTodas("fluxo_caixa", v)} />;
      case "parcelas_clientes": return <ModalPermissoesParcelasClientes value={dados.parcelas_clientes} disabled={disabled} onChange={(a, v) => alterar("parcelas_clientes", a, v)} onAplicarTodas={v => aplicarTodas("parcelas_clientes", v)} />;
      case "conexoes_whatsapp": return <ModalPermissoesConexoesWhatsapp value={dados.conexoes_whatsapp} disabled={disabled} onChange={(a, v) => alterar("conexoes_whatsapp", a, v)} onAplicarTodas={v => aplicarTodas("conexoes_whatsapp", v)} />;
      case "armazenamento": return <ModalPermissoesArmazenamento value={dados.armazenamento} disabled={disabled} onChange={(a, v) => alterar("armazenamento", a, v)} onAplicarTodas={v => aplicarTodas("armazenamento", v)} />;
      case "seguradoras": return <ModalPermissoesSeguradoras />;
      case "configuracoes": return <ModalPermissoesConfiguracoes />;
      default: return null;
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4" role="presentation">
      <button type="button" aria-label="Fechar permissões" onClick={solicitarFechamento} className="absolute inset-0 bg-zinc-950/70 backdrop-blur-sm" />
      <div role="dialog" aria-modal="true" aria-label={`Permissões de ${nomeUsuario ?? "membro"}`}
        className="relative flex h-[min(94dvh,900px)] w-full max-w-[1360px] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 sm:rounded-3xl">
        {/* Cabeçalho */}
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"><ShieldCheck size={23}/></span>
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-xl">Central de permissões</h2>
              <p className="truncate text-xs font-semibold text-zinc-700 dark:text-zinc-300 sm:text-sm">{nomeUsuario || "Membro da equipe"}</p>
              {emailUsuario && <p className="truncate text-[11px] text-zinc-500">{emailUsuario}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dados && <span className="hidden rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-500 dark:border-zinc-700 sm:inline-flex">{contarConcedidas(dados)} ações autorizadas</span>}
            <button type="button" onClick={solicitarFechamento} disabled={saving} aria-label="Fechar" className="rounded-xl bg-zinc-100 p-2.5 text-zinc-600 hover:bg-zinc-200 disabled:opacity-40 dark:bg-zinc-800 dark:text-zinc-300"><X size={19}/></button>
          </div>
        </header>

        {/* Área central, navegação por grupos e módulo único */}
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          {loading && <div className="flex min-h-[350px] flex-col items-center justify-center gap-3 text-sm text-zinc-500"><Loader2 size={29} className="animate-spin text-violet-600"/>Carregando permissões do usuário...</div>}
          {!loading && !dados && !erro && <p className="py-10 text-center text-sm text-zinc-500">Nenhum dado de permissões disponível.</p>}
          {!loading && dados && (
            <div className="mx-auto max-w-[1240px] space-y-5">
              {/* Navegação */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  {grupoAtual ? (
                    <button type="button" onClick={() => { setGrupoSelecionado(null); setModuloSelecionado(null); }} className="inline-flex items-center gap-2 text-sm font-bold text-violet-700 hover:text-violet-900 dark:text-violet-300"><ArrowLeft size={17}/> Todos os grupos</button>
                  ) : (
                    <div><h3 className="text-lg font-extrabold text-zinc-900 dark:text-white">Escolha o grupo de permissões</h3><p className="mt-1 text-xs text-zinc-500">Selecione um grupo para editar os módulos disponíveis.</p></div>
                  )}
                </div>
                <button type="button" onClick={() => { setMostrarPresets(v => !v); setPrevisualizandoPreset(false); }} className={BOTAO_SECUNDARIO} aria-expanded={mostrarPresets}>
                  <Sparkles size={16} className="text-violet-600" /> Presets de cargo
                </button>
              </div>

              {mostrarPresets && (
                <section className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900/60 dark:bg-violet-500/5 sm:p-5" aria-label="Presets de permissões">
                  <div className="flex items-start gap-3"><UserRoundCog size={20} className="mt-0.5 shrink-0 text-violet-700 dark:text-violet-300"/><div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Modelo sugerido por cargo</h4>
                    <p className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-400">Os presets são pontos de partida conservadores. Não alteram o cargo do membro. Aplicá-los substitui o rascunho de TODOS os 10 módulos implementados; os módulos futuros continuam intocados. Nada é gravado até clicar em Salvar.</p>
                  </div></div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                    <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                      Cargo/modelo
                      <select value={cargoPreset} onChange={e => { setCargoPreset(e.target.value as CargoPreset); setPrevisualizandoPreset(false); }} className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                        {CARGOS_PRESET.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </label>
                    <button type="button" onClick={() => setPrevisualizandoPreset(true)} className={BOTAO_SECUNDARIO}>Pré-visualizar alterações</button>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">{CARGOS_PRESET.find(c => c.value === cargoPreset)?.descricao}</p>
                  {previsualizandoPreset && <div className="mt-4 rounded-xl border border-violet-200 bg-white p-4 dark:border-violet-900 dark:bg-zinc-900">
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">O preset modificará {previaPreset.length} ação(ões) do rascunho atual.</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-400">Isso pode remover acessos que o usuário já possui. Revise os módulos antes de salvar; permissões sensíveis não são concedidas automaticamente pelo preset.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" disabled={saving || previaPreset.length === 0} onClick={aplicarPresetAoRascunho} className={BOTAO_PRIMARIO}>Aplicar ao rascunho</button>
                      <button type="button" onClick={() => setPrevisualizandoPreset(false)} className={BOTAO_SECUNDARIO}>Cancelar</button>
                    </div>
                  </div>}
                </section>
              )}

              {!grupoAtual ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {GRUPOS_PERMISSOES.map(grupo => {
                    const Icon = grupo.icon;
                    const ativos = grupo.modulos.filter(m => m.implementado).length;
                    const alteracoesGrupo = diferencas.filter(d => grupo.modulos.some(m => m.id === d.modulo)).length;
                    return <button type="button" key={grupo.id} onClick={() => escolherGrupo(grupo.id)}
                      className="group flex min-h-[175px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-violet-600">
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"><Icon size={23}/></span>
                        <ChevronRight size={20} className="text-zinc-400 transition group-hover:translate-x-1 group-hover:text-violet-600"/>
                      </div>
                      <div className="mt-5">
                        <h4 className="text-lg font-extrabold text-zinc-900 dark:text-white">{grupo.titulo}</h4>
                        <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{grupo.descricao}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold">
                          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{grupo.modulos.length} módulos</span>
                          {ativos > 0 ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{ativos} homologados</span> : <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Em preparação</span>}
                          {alteracoesGrupo > 0 && <span className="rounded-full bg-violet-100 px-2.5 py-1 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">{alteracoesGrupo} alterações</span>}
                        </div>
                      </div>
                    </button>;
                  })}
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2" aria-label="Trocar grupo">
                    {GRUPOS_PERMISSOES.map(grupo => <button type="button" key={grupo.id} onClick={() => escolherGrupo(grupo.id)}
                      aria-pressed={grupo.id === grupoSelecionado}
                      className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition ${grupo.id === grupoSelecionado ? "border-violet-600 bg-violet-600 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-violet-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"}`}>
                      {grupo.titulo}
                    </button>)}
                  </div>
                  <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[285px_minmax(0,1fr)]">
                    <aside className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800"><p className="text-sm font-extrabold text-zinc-900 dark:text-white">{grupoAtual.titulo}</p><p className="mt-0.5 text-xs text-zinc-500">Selecione o módulo</p></div>
                      <nav className="grid grid-cols-2 gap-1.5 p-2 sm:grid-cols-3 lg:grid-cols-1" aria-label={`Módulos de ${grupoAtual.titulo}`}>
                        {grupoAtual.modulos.map(modulo => {
                          const Icon = modulo.icon;
                          const selecionado = moduloSelecionado === modulo.id;
                          const mudou = diferencas.some(item => item.modulo === modulo.id);
                          return <button type="button" key={modulo.id} onClick={() => setModuloSelecionado(modulo.id)} aria-current={selecionado ? "page" : undefined}
                            className={`flex min-w-0 items-center gap-2.5 rounded-xl p-2.5 text-left transition ${selecionado ? "bg-violet-50 text-violet-800 ring-1 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-900" : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"}`}>
                            <Icon size={17} className="shrink-0"/>
                            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{modulo.titulo}</span><span className="mt-0.5 block truncate text-[10px] opacity-70">{modulo.implementado ? "Configurável" : "Em preparação"}</span></span>
                            {mudou && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" title="Alterações pendentes"/>}
                          </button>;
                        })}
                      </nav>
                    </aside>
                    <div className="min-w-0 space-y-3">
                      {moduloAtual && !moduloAtual.implementado && <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300"><Clock3 size={15}/> Módulo futuro — nenhuma autorização será enviada ao banco.</div>}
                      {renderizarModulo()}
                    </div>
                  </div>
                </>
              )}
              <div className="flex items-start gap-2 rounded-xl border border-zinc-200 bg-white p-3 text-xs leading-5 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"><LockKeyhole size={16} className="mt-0.5 shrink-0"/><span>As configurações aqui controlam permissões dentro da mesma corretora. As regras de isolamento e autorização no backend continuam sendo a fonte efetiva de segurança.</span></div>
            </div>
          )}
          {erro && <div role="alert" className="mx-auto mt-4 flex max-w-[1240px] items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-300"><AlertCircle size={18} className="mt-0.5 shrink-0"/>{erro}</div>}
          {sucesso && <div role="status" className="mx-auto mt-4 flex max-w-[1240px] items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300"><CheckCircle2 size={18} className="mt-0.5 shrink-0"/>{sucesso}</div>}
        </main>

        {/* Rodapé com rascunho global */}
        <footer className="flex shrink-0 flex-col gap-3 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-center gap-2 text-xs text-zinc-500">
            {diferencas.length > 0 ? <><Info size={17} className="shrink-0 text-amber-600"/><span><strong className="text-zinc-800 dark:text-zinc-100">{diferencas.length} alterações não salvas</strong>{quantidadeCritica > 0 ? ` · ${quantidadeCritica} de maior sensibilidade` : ""}. Valem para todos os grupos.</span></> : <><CheckCircle2 size={17} className="shrink-0 text-emerald-600"/><span>Sem alterações pendentes</span></>}
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" disabled={saving} onClick={solicitarFechamento} className={BOTAO_SECUNDARIO}>Fechar</button>
            <button type="button" onClick={() => void salvarPermissoes()} disabled={!dados || loading || saving || !usuarioId || !corretoraId || diferencas.length === 0} className={BOTAO_PRIMARIO}>
              {saving ? <Loader2 size={17} className="animate-spin"/> : <Save size={17}/>} {saving ? "Salvando..." : `Salvar alterações${diferencas.length ? ` (${diferencas.length})` : ""}`}
            </button>
          </div>
        </footer>

        {confirmarSaida && <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/65 p-4" role="alertdialog" aria-modal="true" aria-label="Descartar alterações">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <AlertCircle size={25} className="text-amber-600"/>
            <h3 className="mt-3 text-lg font-bold text-zinc-900 dark:text-white">Descartar alterações?</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">Existem {diferencas.length} alteração(ões) ainda não salvas. Fechar descartará somente o rascunho; os dados do servidor permanecem intactos.</p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setConfirmarSaida(false)} className={BOTAO_SECUNDARIO}>Continuar editando</button>
              <button type="button" onClick={() => { setConfirmarSaida(false); onClose(); }} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700">Descartar e fechar</button>
            </div>
          </div>
        </div>}
      </div>
    </div>
  );
}
