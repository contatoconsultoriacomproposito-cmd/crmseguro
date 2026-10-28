import { useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  CheckCircle2,
  Headphones,
  Landmark,
  Loader2,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";

import { supabase } from "../../../lib/supabaseClient";

type EscopoPermissao = "PROPRIOS" | "EQUIPE" | "CORRETORA";

export interface MembroPermissoes {
  id: string;
  nome: string;
  email: string;
  corretora_id: string;
}

interface PermissoesComEscopo {
  visualizar: boolean;
  criar?: boolean;
  editar?: boolean;
  excluir?: boolean;
  transferir?: boolean;
  fechar?: boolean;
  escopo: EscopoPermissao;
}

interface PermissoesEquipes {
  visualizar: boolean;
  criar: boolean;
  editar: boolean;
  excluir: boolean;
}

interface PermissoesWhatsApp {
  visualizar: boolean;
  enviar: boolean;
  assumir_conversa: boolean;
  transferir_conversa: boolean;
  encerrar_conversa: boolean;
  visualizar_todas_conversas: boolean;
  gerenciar_conexoes: boolean;
}

interface PermissoesProdutos {
  visualizar: boolean;
  gerenciar: boolean;
}

export interface MatrizPermissoes {
  equipes: PermissoesEquipes;
  clientes: PermissoesComEscopo & {
    criar: boolean;
    editar: boolean;
    excluir: boolean;
    transferir: boolean;
  };
  propostas: PermissoesComEscopo & {
    criar: boolean;
    editar: boolean;
    excluir: boolean;
    fechar: boolean;
  };
  financeiro: PermissoesComEscopo & {
    criar: boolean;
    editar: boolean;
    excluir: boolean;
  };
  comissoes: {
    visualizar: boolean;
    editar: boolean;
    escopo: EscopoPermissao;
  };
  sinistros: PermissoesComEscopo & {
    criar: boolean;
    editar: boolean;
    excluir: boolean;
  };
  assistencias: PermissoesComEscopo & {
    criar: boolean;
    editar: boolean;
    excluir: boolean;
  };
  whatsapp: PermissoesWhatsApp;
  produtos: PermissoesProdutos;
}

interface ModalPermissoesProps {
  aberto: boolean;
  membro: MembroPermissoes | null;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}

type ModuloComEscopo =
  | "clientes"
  | "propostas"
  | "financeiro"
  | "comissoes"
  | "sinistros"
  | "assistencias";

const PERMISSOES_PADRAO: MatrizPermissoes = {
  equipes: {
    visualizar: false,
    criar: false,
    editar: false,
    excluir: false,
  },
  clientes: {
    visualizar: true,
    criar: true,
    editar: true,
    excluir: false,
    transferir: false,
    escopo: "PROPRIOS",
  },
  propostas: {
    visualizar: true,
    criar: true,
    editar: true,
    excluir: false,
    fechar: true,
    escopo: "PROPRIOS",
  },
  financeiro: {
    visualizar: false,
    criar: false,
    editar: false,
    excluir: false,
    escopo: "PROPRIOS",
  },
  comissoes: {
    visualizar: true,
    editar: false,
    escopo: "PROPRIOS",
  },
  sinistros: {
    visualizar: true,
    criar: true,
    editar: true,
    excluir: false,
    escopo: "PROPRIOS",
  },
  assistencias: {
    visualizar: true,
    criar: true,
    editar: true,
    excluir: false,
    escopo: "PROPRIOS",
  },
  whatsapp: {
    visualizar: true,
    enviar: true,
    assumir_conversa: true,
    transferir_conversa: false,
    encerrar_conversa: true,
    visualizar_todas_conversas: false,
    gerenciar_conexoes: false,
  },
  produtos: {
    visualizar: true,
    gerenciar: false,
  },
};

const ESCOPOS: Array<{
  value: EscopoPermissao;
  label: string;
  descricao: string;
}> = [
  {
    value: "PROPRIOS",
    label: "Somente próprios",
    descricao: "Acessa apenas registros sob sua responsabilidade.",
  },
  {
    value: "EQUIPE",
    label: "Equipe",
    descricao: "Acessa os próprios registros e os registros da equipe.",
  },
  {
    value: "CORRETORA",
    label: "Toda a corretora",
    descricao: "Acessa todos os registros da corretora.",
  },
];

function clonePadrao(): MatrizPermissoes {
  return JSON.parse(JSON.stringify(PERMISSOES_PADRAO)) as MatrizPermissoes;
}

function normalizarPermissoes(raw: unknown): MatrizPermissoes {
  const base = clonePadrao();

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return base;
  }

  const value = raw as Partial<
    Record<keyof MatrizPermissoes, Record<string, unknown>>
  >;

  return {
    equipes: {
      ...base.equipes,
      ...(value.equipes || {}),
    },
    clientes: {
      ...base.clientes,
      ...(value.clientes || {}),
    },
    propostas: {
      ...base.propostas,
      ...(value.propostas || {}),
    },
    financeiro: {
      ...base.financeiro,
      ...(value.financeiro || {}),
    },
    comissoes: {
      ...base.comissoes,
      ...(value.comissoes || {}),
    },
    sinistros: {
      ...base.sinistros,
      ...(value.sinistros || {}),
    },
    assistencias: {
      ...base.assistencias,
      ...(value.assistencias || {}),
    },
    whatsapp: {
      ...base.whatsapp,
      ...(value.whatsapp || {}),
    },
    produtos: {
      ...base.produtos,
      ...(value.produtos || {}),
    },
  } as MatrizPermissoes;
}

export default function ModalPermissoes({
  aberto,
  membro,
  onClose,
  onSaved,
}: ModalPermissoesProps) {
  const [permissoes, setPermissoes] =
    useState<MatrizPermissoes>(() => clonePadrao());

  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    if (!aberto || !membro?.id) return;

    void carregarPermissoes();
  }, [aberto, membro?.id]);

  const totalAtivas = useMemo(() => {
    let total = 0;

    Object.values(permissoes).forEach((grupo) => {
      Object.entries(grupo).forEach(([chave, valor]) => {
        if (chave !== "escopo" && valor === true) {
          total += 1;
        }
      });
    });

    return total;
  }, [permissoes]);

  async function carregarPermissoes() {
    if (!membro?.id) return;

    try {
      setLoading(true);
      setErro("");
      setMensagem("");

      const { data, error } = await supabase
        .from("crm_usuario_permissoes")
        .select("permissoes")
        .eq("usuario_id", membro.id)
        .maybeSingle();

      if (error) throw error;

      setPermissoes(
        data?.permissoes
          ? normalizarPermissoes(data.permissoes)
          : clonePadrao()
      );
    } catch (error: any) {
      console.error("Erro ao carregar permissões:", error);

      setErro(
        error?.message ||
          "Não foi possível carregar as permissões deste usuário."
      );
    } finally {
      setLoading(false);
    }
  }

  function atualizarBooleano<
    M extends keyof MatrizPermissoes,
    K extends keyof MatrizPermissoes[M]
  >(modulo: M, chave: K, valor: boolean) {
    setPermissoes((prev) => ({
      ...prev,
      [modulo]: {
        ...prev[modulo],
        [chave]: valor,
      },
    }));
  }

  function atualizarEscopo(
    modulo: ModuloComEscopo,
    escopo: EscopoPermissao
  ) {
    setPermissoes((prev) => ({
      ...prev,
      [modulo]: {
        ...prev[modulo],
        escopo,
      },
    }));
  }

  function restaurarPadrao() {
    setPermissoes(clonePadrao());
    setErro("");
    setMensagem("");
  }

  async function salvarPermissoes() {
    if (!membro || salvando) return;

    try {
      setSalvando(true);
      setErro("");
      setMensagem("");

      const { error } = await supabase
        .from("crm_usuario_permissoes")
        .upsert(
          {
            corretora_id: membro.corretora_id,
            usuario_id: membro.id,
            permissoes,
          },
          {
            onConflict: "usuario_id",
          }
        );

      if (error) throw error;

      setMensagem(
        "Permissões salvas com sucesso."
        );

        if (onSaved) {
        await onSaved();
        }

        onClose();
    } catch (error: any) {
      console.error("Erro ao salvar permissões:", error);

      setErro(
        error?.message ||
          "Não foi possível salvar as permissões deste usuário."
      );
    } finally {
      setSalvando(false);
    }
  }

  function fecharModal() {
    if (salvando) return;

    setErro("");
    setMensagem("");
    onClose();
  }

  if (!aberto || !membro) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        onClick={fecharModal}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-100 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <ShieldCheck
                size={20}
                className="shrink-0 text-purple-600"
              />

              <h2 className="truncate text-xl font-black text-zinc-900 dark:text-white">
                Permissões do usuário
              </h2>
            </div>

            <p className="truncate text-sm text-zinc-500">
              {membro.nome} • {membro.email}
            </p>
          </div>

          <button
            type="button"
            onClick={fecharModal}
            disabled={salvando}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 transition-colors hover:text-zinc-900 disabled:opacity-50 dark:bg-zinc-800 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2
                size={32}
                className="mb-3 animate-spin text-purple-600"
              />

              <p className="text-sm font-medium text-zinc-500">
                Carregando permissões...
              </p>
            </div>
          ) : (
            <div className="space-y-5 p-6">
              <div className="flex flex-col gap-3 rounded-2xl border border-purple-100 bg-purple-50/70 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-purple-900/30 dark:bg-purple-500/5">
                <div>
                  <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                    Controle de acesso
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    Defina o que este usuário poderá visualizar e executar dentro do CRM.
                  </p>
                </div>

                <div className="shrink-0 rounded-xl bg-white px-3 py-2 text-xs font-bold text-purple-700 shadow-sm dark:bg-zinc-900 dark:text-purple-400">
                  {totalAtivas} permissões ativas
                </div>
              </div>

              <SecaoPermissao
                titulo="Equipe"
                descricao="Gerenciamento dos membros da corretora."
                icon={<Users size={18} />}
              >
                <GridPermissoes>
                  <SwitchPermissao
                    label="Visualizar"
                    checked={permissoes.equipes.visualizar}
                    onChange={(valor) =>
                      atualizarBooleano("equipes", "visualizar", valor)
                    }
                  />
                  <SwitchPermissao
                    label="Criar"
                    checked={permissoes.equipes.criar}
                    onChange={(valor) =>
                      atualizarBooleano("equipes", "criar", valor)
                    }
                  />
                  <SwitchPermissao
                    label="Editar"
                    checked={permissoes.equipes.editar}
                    onChange={(valor) =>
                      atualizarBooleano("equipes", "editar", valor)
                    }
                  />
                  <SwitchPermissao
                    label="Excluir"
                    checked={permissoes.equipes.excluir}
                    onChange={(valor) =>
                      atualizarBooleano("equipes", "excluir", valor)
                    }
                  />
                </GridPermissoes>
              </SecaoPermissao>

              <SecaoPermissao
                titulo="Clientes"
                descricao="Cadastro, manutenção e transferência de clientes."
                icon={<BriefcaseBusiness size={18} />}
              >
                <GridPermissoes>
                  <SwitchPermissao
                    label="Visualizar"
                    checked={permissoes.clientes.visualizar}
                    onChange={(valor) =>
                      atualizarBooleano("clientes", "visualizar", valor)
                    }
                  />
                  <SwitchPermissao
                    label="Criar"
                    checked={permissoes.clientes.criar}
                    onChange={(valor) =>
                      atualizarBooleano("clientes", "criar", valor)
                    }
                  />
                  <SwitchPermissao
                    label="Editar"
                    checked={permissoes.clientes.editar}
                    onChange={(valor) =>
                      atualizarBooleano("clientes", "editar", valor)
                    }
                  />
                  <SwitchPermissao
                    label="Excluir"
                    checked={permissoes.clientes.excluir}
                    onChange={(valor) =>
                      atualizarBooleano("clientes", "excluir", valor)
                    }
                  />
                  <SwitchPermissao
                    label="Transferir"
                    checked={permissoes.clientes.transferir}
                    onChange={(valor) =>
                      atualizarBooleano("clientes", "transferir", valor)
                    }
                  />
                </GridPermissoes>

                <SeletorEscopo
                  value={permissoes.clientes.escopo}
                  onChange={(valor) => atualizarEscopo("clientes", valor)}
                />
              </SecaoPermissao>

              <SecaoPermissao
                titulo="Propostas"
                descricao="Criação, edição e fechamento das propostas."
                icon={<SlidersHorizontal size={18} />}
              >
                <GridPermissoes>
                  <SwitchPermissao
                    label="Visualizar"
                    checked={permissoes.propostas.visualizar}
                    onChange={(valor) =>
                      atualizarBooleano("propostas", "visualizar", valor)
                    }
                  />
                  <SwitchPermissao
                    label="Criar"
                    checked={permissoes.propostas.criar}
                    onChange={(valor) =>
                      atualizarBooleano("propostas", "criar", valor)
                    }
                  />
                  <SwitchPermissao
                    label="Editar"
                    checked={permissoes.propostas.editar}
                    onChange={(valor) =>
                      atualizarBooleano("propostas", "editar", valor)
                    }
                  />
                  <SwitchPermissao
                    label="Excluir"
                    checked={permissoes.propostas.excluir}
                    onChange={(valor) =>
                      atualizarBooleano("propostas", "excluir", valor)
                    }
                  />
                  <SwitchPermissao
                    label="Fechar proposta"
                    checked={permissoes.propostas.fechar}
                    onChange={(valor) =>
                      atualizarBooleano("propostas", "fechar", valor)
                    }
                  />
                </GridPermissoes>

                <SeletorEscopo
                  value={permissoes.propostas.escopo}
                  onChange={(valor) => atualizarEscopo("propostas", valor)}
                />
              </SecaoPermissao>

              <SecaoPermissao
                titulo="Financeiro"
                descricao="Acesso aos registros financeiros da corretora."
                icon={<Landmark size={18} />}
              >
                <GridPermissoes>
                  <SwitchPermissao
                    label="Visualizar"
                    checked={permissoes.financeiro.visualizar}
                    onChange={(valor) =>
                      atualizarBooleano("financeiro", "visualizar", valor)
                    }
                  />
                  <SwitchPermissao
                    label="Criar"
                    checked={permissoes.financeiro.criar}
                    onChange={(valor) =>
                      atualizarBooleano("financeiro", "criar", valor)
                    }
                  />
                  <SwitchPermissao
                    label="Editar"
                    checked={permissoes.financeiro.editar}
                    onChange={(valor) =>
                      atualizarBooleano("financeiro", "editar", valor)
                    }
                  />
                  <SwitchPermissao
                    label="Excluir"
                    checked={permissoes.financeiro.excluir}
                    onChange={(valor) =>
                      atualizarBooleano("financeiro", "excluir", valor)
                    }
                  />
                </GridPermissoes>

                <SeletorEscopo
                  value={permissoes.financeiro.escopo}
                  onChange={(valor) => atualizarEscopo("financeiro", valor)}
                />
              </SecaoPermissao>

              <SecaoPermissao
                titulo="Comissões"
                descricao="Consulta e manutenção das comissões."
                icon={<BadgeDollarSign size={18} />}
              >
                <GridPermissoes>
                  <SwitchPermissao
                    label="Visualizar"
                    checked={permissoes.comissoes.visualizar}
                    onChange={(valor) =>
                      atualizarBooleano("comissoes", "visualizar", valor)
                    }
                  />
                  <SwitchPermissao
                    label="Editar"
                    checked={permissoes.comissoes.editar}
                    onChange={(valor) =>
                      atualizarBooleano("comissoes", "editar", valor)
                    }
                  />
                </GridPermissoes>

                <SeletorEscopo
                  value={permissoes.comissoes.escopo}
                  onChange={(valor) => atualizarEscopo("comissoes", valor)}
                />
              </SecaoPermissao>

              <SecaoPermissao
                titulo="Sinistros"
                descricao="Abertura e acompanhamento de sinistros."
                icon={<ShieldCheck size={18} />}
              >
                <GridPermissoes>
                  <SwitchPermissao
                    label="Visualizar"
                    checked={permissoes.sinistros.visualizar}
                    onChange={(valor) =>
                      atualizarBooleano("sinistros", "visualizar", valor)
                    }
                  />
                  <SwitchPermissao
                    label="Criar"
                    checked={permissoes.sinistros.criar}
                    onChange={(valor) =>
                      atualizarBooleano("sinistros", "criar", valor)
                    }
                  />
                  <SwitchPermissao
                    label="Editar"
                    checked={permissoes.sinistros.editar}
                    onChange={(valor) =>
                      atualizarBooleano("sinistros", "editar", valor)
                    }
                  />
                  <SwitchPermissao
                    label="Excluir"
                    checked={permissoes.sinistros.excluir}
                    onChange={(valor) =>
                      atualizarBooleano("sinistros", "excluir", valor)
                    }
                  />
                </GridPermissoes>

                <SeletorEscopo
                  value={permissoes.sinistros.escopo}
                  onChange={(valor) => atualizarEscopo("sinistros", valor)}
                />
              </SecaoPermissao>

              <SecaoPermissao
                titulo="Assistências"
                descricao="Abertura e acompanhamento de assistências."
                icon={<Headphones size={18} />}
              >
                <GridPermissoes>
                  <SwitchPermissao
                    label="Visualizar"
                    checked={permissoes.assistencias.visualizar}
                    onChange={(valor) =>
                      atualizarBooleano("assistencias", "visualizar", valor)
                    }
                  />
                  <SwitchPermissao
                    label="Criar"
                    checked={permissoes.assistencias.criar}
                    onChange={(valor) =>
                      atualizarBooleano("assistencias", "criar", valor)
                    }
                  />
                  <SwitchPermissao
                    label="Editar"
                    checked={permissoes.assistencias.editar}
                    onChange={(valor) =>
                      atualizarBooleano("assistencias", "editar", valor)
                    }
                  />
                  <SwitchPermissao
                    label="Excluir"
                    checked={permissoes.assistencias.excluir}
                    onChange={(valor) =>
                      atualizarBooleano("assistencias", "excluir", valor)
                    }
                  />
                </GridPermissoes>

                <SeletorEscopo
                  value={permissoes.assistencias.escopo}
                  onChange={(valor) => atualizarEscopo("assistencias", valor)}
                />
              </SecaoPermissao>

              <SecaoPermissao
                titulo="WhatsApp"
                descricao="Uso das conversas e gerenciamento das conexões."
                icon={<MessageCircle size={18} />}
              >
                <GridPermissoes>
                  <SwitchPermissao
                    label="Visualizar"
                    checked={permissoes.whatsapp.visualizar}
                    onChange={(valor) =>
                      atualizarBooleano("whatsapp", "visualizar", valor)
                    }
                  />
                  <SwitchPermissao
                    label="Enviar mensagens"
                    checked={permissoes.whatsapp.enviar}
                    onChange={(valor) =>
                      atualizarBooleano("whatsapp", "enviar", valor)
                    }
                  />
                  <SwitchPermissao
                    label="Assumir conversa"
                    checked={permissoes.whatsapp.assumir_conversa}
                    onChange={(valor) =>
                      atualizarBooleano(
                        "whatsapp",
                        "assumir_conversa",
                        valor
                      )
                    }
                  />
                  <SwitchPermissao
                    label="Transferir conversa"
                    checked={permissoes.whatsapp.transferir_conversa}
                    onChange={(valor) =>
                      atualizarBooleano(
                        "whatsapp",
                        "transferir_conversa",
                        valor
                      )
                    }
                  />
                  <SwitchPermissao
                    label="Encerrar conversa"
                    checked={permissoes.whatsapp.encerrar_conversa}
                    onChange={(valor) =>
                      atualizarBooleano(
                        "whatsapp",
                        "encerrar_conversa",
                        valor
                      )
                    }
                  />
                  <SwitchPermissao
                    label="Visualizar todas"
                    checked={permissoes.whatsapp.visualizar_todas_conversas}
                    onChange={(valor) =>
                      atualizarBooleano(
                        "whatsapp",
                        "visualizar_todas_conversas",
                        valor
                      )
                    }
                  />
                  <SwitchPermissao
                    label="Gerenciar conexões"
                    checked={permissoes.whatsapp.gerenciar_conexoes}
                    onChange={(valor) =>
                      atualizarBooleano(
                        "whatsapp",
                        "gerenciar_conexoes",
                        valor
                      )
                    }
                  />
                </GridPermissoes>
              </SecaoPermissao>

              <SecaoPermissao
                titulo="Produtos"
                descricao="Disponibilidade e gerenciamento de produtos das seguradoras."
                icon={<PackageCheck size={18} />}
              >
                <GridPermissoes>
                  <SwitchPermissao
                    label="Visualizar"
                    checked={permissoes.produtos.visualizar}
                    onChange={(valor) =>
                      atualizarBooleano("produtos", "visualizar", valor)
                    }
                  />
                  <SwitchPermissao
                    label="Gerenciar"
                    checked={permissoes.produtos.gerenciar}
                    onChange={(valor) =>
                      atualizarBooleano("produtos", "gerenciar", valor)
                    }
                  />
                </GridPermissoes>
              </SecaoPermissao>

              {erro && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-500/10 dark:text-red-400">
                  {erro}
                </div>
              )}

              {mensagem && (
                <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700 dark:border-green-900/50 dark:bg-green-500/10 dark:text-green-400">
                  <CheckCircle2 size={18} />
                  {mensagem}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-zinc-100 bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900">
          <button
            type="button"
            onClick={restaurarPadrao}
            disabled={loading || salvando}
            className="rounded-2xl px-4 py-3 text-sm font-bold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            Restaurar padrão
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={fecharModal}
              disabled={salvando}
              className="flex-1 rounded-2xl bg-zinc-100 px-5 py-3 font-bold text-zinc-600 disabled:opacity-50 sm:flex-none dark:bg-zinc-800 dark:text-zinc-300"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={salvarPermissoes}
              disabled={loading || salvando}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-purple-600 px-6 py-3 font-bold text-white transition-colors hover:bg-purple-700 disabled:opacity-50 sm:flex-none"
            >
              {salvando && (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              )}

              Salvar permissões
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecaoPermissao({
  titulo,
  descricao,
  icon,
  children,
}: {
  titulo: string;
  descricao: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="flex items-start gap-3 border-b border-zinc-100 p-4 dark:border-zinc-800">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
          {icon}
        </div>

        <div>
          <h3 className="font-black text-zinc-900 dark:text-white">
            {titulo}
          </h3>

          <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
            {descricao}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {children}
      </div>
    </section>
  );
}

function GridPermissoes({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </div>
  );
}

function SwitchPermissao({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 transition-colors hover:border-purple-200 hover:bg-purple-50/40 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-purple-900/50 dark:hover:bg-purple-500/5">
      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        {label}
      </span>

      <span className="relative shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />

        <span className="block h-6 w-11 rounded-full bg-zinc-300 transition-colors peer-checked:bg-purple-600 dark:bg-zinc-700" />

        <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function SeletorEscopo({
  value,
  onChange,
}: {
  value: EscopoPermissao;
  onChange: (value: EscopoPermissao) => void;
}) {
  const atual =
    ESCOPOS.find((item) => item.value === value) ||
    ESCOPOS[0];

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[190px_1fr] md:items-center">
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-zinc-500">
            Escopo de acesso
          </label>

          <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
            Define quais registros o usuário poderá consultar neste módulo.
          </p>
        </div>

        <div>
          <select
            value={value}
            onChange={(event) =>
              onChange(event.target.value as EscopoPermissao)
            }
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm font-semibold text-zinc-700 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
          >
            {ESCOPOS.map((escopo) => (
              <option
                key={escopo.value}
                value={escopo.value}
              >
                {escopo.label}
              </option>
            ))}
          </select>

          <p className="mt-2 text-[11px] text-zinc-400">
            {atual.descricao}
          </p>
        </div>
      </div>
    </div>
  );
}
