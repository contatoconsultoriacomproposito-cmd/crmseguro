import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Save, ShieldCheck, UsersRound, UserRoundCog, Wallet, Settings2, X } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import ModalPermissoesContatos from "./components/ModalPermissoesContatos";
import ModalPermissoesConversas from "./components/ModalPermissoesConversas";
import ModalPermissoesAgenda from "./components/ModalPermissoesAgenda";
import ModalPermissoesEquipe from "./components/ModalPermissoesEquipe";
import ModalPermissoesPropostas from "./components/ModalPermissoesPropostas";
import { PERMISSOES_CONTATOS_PADRAO, PERMISSOES_CONVERSAS_PADRAO, PERMISSOES_AGENDA_PADRAO, PERMISSOES_EQUIPE_PADRAO, PERMISSOES_PROPOSTAS_PADRAO,
 OPCOES_ESCOPO_CONTATOS, normalizarPermissoesContatos, normalizarPermissoesConversas, normalizarPermissoesAgenda, normalizarPermissoesEquipe, normalizarPermissoesPropostas,
 type PermissoesContatos, type PermissoesConversas, type PermissoesAgenda, type PermissoesEquipe, type PermissoesPropostas,
 type EscopoContato, type EscopoConversa, type EscopoAgenda, type EscopoAgendaGoogle, type EscopoEquipe, type EscopoProposta, type ModalPermissoesUsuarioProps
} from "./components/permissoesTypes";

async function chamarEquipe(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("cadastrar-usuario", { body });

  if (error) {
    let mensagem = error.message;
    try {
      const context = (error as any).context;
      if (context && typeof context.json === "function") {
        const resposta = await context.json();
        if (typeof resposta?.error === "string") mensagem = resposta.error;
      }
    } catch {
      // Mantemos a mensagem da função.
    }
    throw new Error(mensagem);
  }

  if (data?.error) throw new Error(data.error);
  if (!data?.success) throw new Error("A operação não retornou confirmação de sucesso.");
  return data;
}

export default function ModalPermissoesUsuario({
  open,
  usuarioId,
  corretoraId,
  nomeUsuario,
  emailUsuario,
  onClose,
  onSaved,
}: ModalPermissoesUsuarioProps) {
  const [
    permissoesContatos,
    setPermissoesContatos,
  ] = useState<PermissoesContatos>({
    ...PERMISSOES_CONTATOS_PADRAO,
  });

  const [
    permissoesConversas,
    setPermissoesConversas,
  ] = useState<PermissoesConversas>({
    ...PERMISSOES_CONVERSAS_PADRAO,
  });

  const [
    permissoesAgenda,
    setPermissoesAgenda,
  ] = useState<PermissoesAgenda>({
    ...PERMISSOES_AGENDA_PADRAO,
  });

  const [permissoesEquipe, setPermissoesEquipe] =
    useState<PermissoesEquipe>({ ...PERMISSOES_EQUIPE_PADRAO });

  const [permissoesPropostas, setPermissoesPropostas] = useState<PermissoesPropostas>({ ...PERMISSOES_PROPOSTAS_PADRAO });

  const [permissoesOriginais, setPermissoesOriginais] = useState<any>({});

  const [loading, setLoading] =
    useState(false);

  const [permissoesCarregadas, setPermissoesCarregadas] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [erro, setErro] =
    useState("");

  const [sucesso, setSucesso] =
    useState("");

  useEffect(() => {
    if (
      !open ||
      !usuarioId ||
      !corretoraId
    ) {
      return;
    }

    void carregarPermissoes();
  }, [
    open,
    usuarioId,
    corretoraId,
  ]);

  async function carregarPermissoes() {
    if (!usuarioId || !corretoraId) return;

    try {
      setLoading(true);
      setPermissoesCarregadas(false);
      setErro("");
      setSucesso("");

      const resposta = await chamarEquipe({
        action: "CONSULTAR_PERMISSOES",
        membro_id: usuarioId,
      });

      const jsonAtual =
        resposta?.permissoes &&
        typeof resposta.permissoes === "object" &&
        !Array.isArray(resposta.permissoes)
          ? resposta.permissoes
          : {};

      setPermissoesOriginais(jsonAtual);
      setPermissoesContatos(normalizarPermissoesContatos(jsonAtual));
      setPermissoesConversas(normalizarPermissoesConversas(jsonAtual));
      setPermissoesAgenda(normalizarPermissoesAgenda(jsonAtual));
      setPermissoesEquipe(normalizarPermissoesEquipe(jsonAtual));
      setPermissoesPropostas(normalizarPermissoesPropostas(jsonAtual));
      setPermissoesCarregadas(true);
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      setErro(error instanceof Error ? error.message : "Não foi possível carregar as permissões do usuário.");
    } finally {
      setLoading(false);
    }
  }

  function alterarPermissaoProposta(acao: keyof PermissoesPropostas, escopo: EscopoProposta) {
    setPermissoesPropostas((prev) => ({ ...prev, [acao]: escopo }));
    setSucesso("");
  }

  function aplicarTodasPropostas(escopo: EscopoProposta) {
    setPermissoesPropostas((prev) =>
      Object.fromEntries(Object.keys(prev).map((chave) => [chave, escopo])) as unknown as PermissoesPropostas
    );
    setSucesso("");
  }

  function alterarPermissaoEquipe(acao: keyof PermissoesEquipe, escopo: EscopoEquipe) {
    setPermissoesEquipe((prev) => ({ ...prev, [acao]: escopo }));
    setSucesso("");
  }

  function aplicarTodasEquipe(escopo: EscopoEquipe) {
    setPermissoesEquipe({
      create: escopo,
      delete: escopo,
      update: escopo,
      password: escopo,
      permissions: escopo,
    });
    setSucesso("");
  }

  function alterarPermissaoContato(
    acao: keyof PermissoesContatos,
    escopo: EscopoContato,
  ) {
    setPermissoesContatos(
      (prev) => ({
        ...prev,
        [acao]: escopo,
      }),
    );

    setSucesso("");
  }

  function alterarPermissaoConversa(
    acao: keyof PermissoesConversas,
    escopo: EscopoConversa,
  ) {
    setPermissoesConversas(
      (prev) => ({
        ...prev,
        [acao]: escopo,
      }),
    );

    setSucesso("");
  }

  function alterarPermissaoAgenda(
    acao: keyof PermissoesAgenda,
    escopo: EscopoAgenda | EscopoAgendaGoogle,
  ) {
    setPermissoesAgenda((prev) => ({
      ...prev,
      [acao]: escopo,
    }));

    setSucesso("");
  }

  function aplicarAgendaOperacional(
    escopo: EscopoAgenda,
  ) {
    setPermissoesAgenda((prev) => ({
      ...prev,
      read: escopo,
      manage: escopo,
    }));

    setSucesso("");
  }

  function aplicarTodasContatos(
    escopo: EscopoContato,
  ) {
    setPermissoesContatos({
      read: escopo,
      create: escopo,
      update: escopo,
      delete: escopo,
      restore: escopo,
      sync: escopo,
      send: escopo,
    });

    setSucesso("");
  }

  function aplicarTodasConversas(
    escopo: EscopoConversa,
  ) {
    setPermissoesConversas({
      read: escopo,
      start: escopo,
      interact: escopo,
      assign: escopo,
      manage: escopo,
      call: escopo,
      automation: escopo,
    });

    setSucesso("");
  }

  async function salvarPermissoes() {
    if (!usuarioId || !corretoraId || saving || loading || !permissoesCarregadas) return;

    try {
      setSaving(true);
      setErro("");
      setSucesso("");

      // Enviamos somente os módulos editáveis. O servidor faz a mesclagem
      // com o JSON atual, preservando os demais módulos da corretora.
      const alteracoes = {
        atendimento: {
          contatos: { ...permissoesContatos },
          conversas: { ...permissoesConversas },
          agenda: { ...permissoesAgenda },
        },
        operacoes: {
          equipe: { ...permissoesEquipe },
          propostas: { ...permissoesPropostas },
        },
      };

      const resposta = await chamarEquipe({
        action: "ALTERAR_PERMISSOES",
        membro_id: usuarioId,
        permissoes: alteracoes,
      });

      const jsonSalvo = resposta?.permissoes && typeof resposta.permissoes === "object"
        ? resposta.permissoes
        : {
            ...permissoesOriginais,
            atendimento: {
              ...(permissoesOriginais?.atendimento || {}),
              ...alteracoes.atendimento,
            },
            operacoes: {
              ...(permissoesOriginais?.operacoes || {}),
              ...alteracoes.operacoes,
            },
          };

      setPermissoesOriginais(jsonSalvo);
      setPermissoesEquipe(normalizarPermissoesEquipe(jsonSalvo));
      setPermissoesPropostas(normalizarPermissoesPropostas(jsonSalvo));
      setSucesso("Permissões atualizadas com sucesso.");
      onSaved?.();
    } catch (error) {
      console.error("Erro ao salvar permissões:", error);
      setErro(error instanceof Error ? error.message : "Não foi possível salvar as permissões.");
    } finally {
      setSaving(false);
    }
  }

  function fechar() {
    if (saving) return;

    setErro("");
    setSucesso("");
    onClose();
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        onClick={fechar}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div className="relative flex max-h-[94vh] w-[98vw] max-w-[1480px] flex-col overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        {/* HEADER */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-100 p-6 dark:border-zinc-800">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
              <ShieldCheck
                size={23}
              />
            </div>

            <div>
              <h2 className="text-xl font-black text-zinc-900 dark:text-white">
                Permissões do usuário
              </h2>

              <p className="mt-1 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                {nomeUsuario ||
                  "Membro da equipe"}
              </p>

              {emailUsuario && (
                <p className="mt-0.5 text-xs text-zinc-400">
                  {emailUsuario}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={fechar}
            disabled={saving}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 transition-colors hover:text-zinc-900 disabled:opacity-50 dark:bg-zinc-800 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-3">
              <Loader2
                size={30}
                className="animate-spin text-purple-600"
              />

              <p className="text-sm font-medium text-zinc-500">
                Carregando permissões...
              </p>
            </div>
          ) : (
            <div className="p-6">
              {/* AVISO */}
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0"
                />

                <div>
                  <p className="text-sm font-bold">
                    Permissões por módulo
                  </p>

                  <p className="mt-1 text-xs leading-5 opacity-80">
                    As permissões abaixo
                    afetam somente o módulo
                    selecionado. O acesso
                    entre corretoras
                    permanece sempre
                    isolado.
                  </p>
                </div>
              </div>

              {/* QUATRO GRUPOS EM DUAS COLUNAS E DUAS LINHAS */}
              <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
                {/* LINHA 1, COLUNA 1 — ATENDIMENTO */}
                <section className="min-w-0 rounded-2xl border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
                  <div className="mb-4 flex items-center gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
                    <UsersRound size={18} className="text-purple-600" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">Atendimento</h3>
                  </div>
                  <div className="space-y-4">
                    <ModalPermissoesContatos value={permissoesContatos} disabled={saving || loading} onChange={alterarPermissaoContato} onAplicarTodas={aplicarTodasContatos} />
                    <ModalPermissoesConversas value={permissoesConversas} disabled={saving || loading} onChange={alterarPermissaoConversa} onAplicarTodas={aplicarTodasConversas} />
                    <ModalPermissoesAgenda value={permissoesAgenda} disabled={saving || loading} onChange={alterarPermissaoAgenda}
                      onAplicarOperacional={aplicarAgendaOperacional} onRemover={() => { setPermissoesAgenda({read:"none",manage:"none",google:"none"}); setSucesso(""); }} />
                  </div>
                </section>

                {/* LINHA 1, COLUNA 2 — OPERAÇÕES */}
                <section className="min-w-0 rounded-2xl border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
                  <div className="mb-4 flex items-center gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
                    <UserRoundCog size={18} className="text-purple-600" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">Operações</h3>
                  </div>
                  <div className="space-y-4">
                    <ModalPermissoesEquipe value={permissoesEquipe} disabled={saving || loading} onChange={alterarPermissaoEquipe} onAplicarTodas={aplicarTodasEquipe} />
                    <ModalPermissoesPropostas value={permissoesPropostas} disabled={saving || loading} onChange={alterarPermissaoProposta} onAplicarTodas={aplicarTodasPropostas} />
                  </div>
                </section>

                {/* LINHA 2, COLUNA 1 — FINANCEIRO */}
                <section className="min-w-0 rounded-2xl border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
                  <div className="mb-4 flex items-center gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
                    <Wallet size={18} className="text-purple-600" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">Financeiro</h3>
                  </div>
                  <p className="rounded-xl border border-dashed border-zinc-200 bg-white p-4 text-xs leading-5 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                    Permissões deste grupo serão adicionadas conforme os módulos forem implementados.
                  </p>
                </section>

                {/* LINHA 2, COLUNA 2 — GESTÃO */}
                <section className="min-w-0 rounded-2xl border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
                  <div className="mb-4 flex items-center gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
                    <Settings2 size={18} className="text-purple-600" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-200">Gestão</h3>
                  </div>
                  <p className="rounded-xl border border-dashed border-zinc-200 bg-white p-4 text-xs leading-5 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                    Permissões deste grupo serão adicionadas conforme os módulos forem implementados.
                  </p>
                </section>
              </div>

              {/* LEGENDA GERAL — CONTATOS */}
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {OPCOES_ESCOPO_CONTATOS.map(
                  (opcao) => (
                    <div
                      key={
                        opcao.value
                      }
                      className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950"
                    >
                      <p className="text-xs font-black uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                        {opcao.label}
                      </p>

                      <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                        {
                          opcao.descricao
                        }
                      </p>
                    </div>
                  ),
                )}
              </div>

              {/* FEEDBACK */}
              {erro && (
                <div className="mt-5 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                  <AlertCircle
                    size={18}
                    className="mt-0.5 shrink-0"
                  />

                  {erro}
                </div>
              )}
            </div>
          )}
        </div>

        {/* FEEDBACK DE SUCESSO NO TOPO */}
        {sucesso && (
          <div className="absolute left-6 right-6 top-[108px] z-20 flex items-start gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700 shadow-sm dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-400">
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0"
            />

            {sucesso}
          </div>
        )}

        {/* FOOTER */}
        <div className="flex shrink-0 justify-end gap-3 border-t border-zinc-100 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
          <button
            type="button"
            onClick={fechar}
            disabled={saving}
            className="rounded-xl bg-zinc-100 px-5 py-2.5 text-sm font-bold text-zinc-600 transition hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() =>
              void salvarPermissoes()
            }
            disabled={
              saving ||
              loading ||
              !usuarioId ||
              !corretoraId
            }
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2
                size={17}
                className="animate-spin"
              />
            ) : (
              <Save size={17} />
            )}

            {saving
              ? "Salvando..."
              : "Salvar permissões"}
          </button>
        </div>
      </div>
    </div>
  );
}

